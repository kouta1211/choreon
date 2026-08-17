/**
 * 作品ぜんぶを、AIへ渡せる長さに畳む。
 *
 * ■ なぜ1シーンだけでは足りないのか
 * 1シーンを見てもらうと「この隊形はこうです」までしか返らない。振付で
 * 気になるのは**流れ**で、「3から4で全員が上手へ寄ったまま戻っていない」
 * のような話は、並べて見なければ言えない。
 *
 * ■ 座標は送らない
 * 30シーン×20人の座標を全部送ると、渡すものが長くなりすぎて、返事の
 * 質より先に上限に当たる。代わりに**アプリが計算した数**を送る —
 * 散り具合(囲む枠)・重心・顔被り・速すぎる移動。
 * どれも「AIに数えさせない」の範囲に収まっている
 * (formationSummary.ts と同じ約束)。
 *
 * ■ シーンは番号で指す
 * 名前は user が変えられるうえ、同じ名前を2つ付けることもできる。
 * **返事で「どのシーンか」を受けるのは番号**にして、名前は読み物として
 * 添えるだけにする。番号は画面の左に出ている 01 / 02 と同じ並び順。
 */

import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { toCentreOrigin } from "./formationSummary";

export type PieceScene = {
  /** 1から。画面左の 01 / 02 と同じ */
  number: number;
  name: string;
  timeSeconds: number;
  /** 前のシーンからの移動にかけられる秒数。先頭なら null */
  segmentSeconds: number | null;
  dancerCount: number;
  /** 全員を囲む枠の大きさ(マス)。散っているか固まっているか */
  spreadX: number;
  spreadY: number;
  /** 全員の重心。センターが0。正が上手・正が客席側 */
  centreX: number;
  centreY: number;
  /** アプリが計算で出した事実。AIに数えさせない */
  facts: {
    hiddenDancers: string[];
    fastMoves: { name: string; meters: number; seconds: number }[];
  };
};

export type PieceSummary = {
  sceneCount: number;
  /** 最後のシーンの時刻。曲の長さではない(曲は送らない) */
  totalSeconds: number;
  dancerNames: string[];
  scenes: PieceScene[];
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildPieceSummary(input: {
  scenes: Scene[];
  dancers: Record<string, Dancer>;
  positionsBySceneId: Record<string, Record<string, Position>>;
  stageWidth: number;
  stageHeight: number;
}): PieceSummary {
  const { scenes, dancers, positionsBySceneId, stageWidth, stageHeight } = input;

  const entries = scenes.map((scene, index): PieceScene => {
    const positions = positionsBySceneId[scene.id] ?? {};
    const nextScene = scenes[index + 1] ?? null;
    const nextPositions = nextScene
      ? (positionsBySceneId[nextScene.id] ?? {})
      : {};

    const centred = Object.values(positions).map((position) =>
      toCentreOrigin(position, stageWidth, stageHeight),
    );

    const xs = centred.map((point) => point.x);
    const ys = centred.map((point) => point.y);
    const mean = (values: number[]) =>
      values.length === 0
        ? 0
        : round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const spread = (values: number[]) =>
      values.length === 0 ? 0 : round(Math.max(...values) - Math.min(...values));

    const hidden = findBlockedDancerIds(positions);
    /**
     * 速すぎる移動は「このシーン → 次のシーン」の話。
     * 次が無い(最後の)シーンでは、そもそも移動が無い。
     */
    const segmentToNext = nextScene
      ? nextScene.timeSeconds - scene.timeSeconds
      : 0;
    const fast =
      nextScene && segmentToNext > 0
        ? findExcessiveMoves(positions, nextPositions, segmentToNext)
        : new Map();

    return {
      number: index + 1,
      name: scene.name,
      timeSeconds: round(scene.timeSeconds),
      segmentSeconds:
        index > 0 ? round(scene.timeSeconds - scenes[index - 1].timeSeconds) : null,
      dancerCount: centred.length,
      spreadX: spread(xs),
      spreadY: spread(ys),
      centreX: mean(xs),
      centreY: mean(ys),
      facts: {
        hiddenDancers: [...hidden]
          .map((id) => dancers[id]?.name)
          .filter((name): name is string => !!name),
        fastMoves: [...fast.entries()].map(([id, strain]) => ({
          name: dancers[id]?.name ?? "?",
          meters: round(strain.distanceMeters),
          seconds: round(strain.seconds),
        })),
      },
    };
  });

  return {
    sceneCount: entries.length,
    totalSeconds: round(scenes[scenes.length - 1]?.timeSeconds ?? 0),
    dancerNames: Object.values(dancers).map((dancer) => dancer.name),
    scenes: entries,
  };
}

/**
 * AIへ渡す本文。
 *
 * 1行に1シーンを詰める。JSONで投げるより短く、返ってくる文も
 * 日本語として自然になる(formationSummary.ts と同じ判断)。
 */
export function formatPieceForPrompt(summary: PieceSummary): string {
  const lines = [
    `シーン数: ${summary.sceneCount}`,
    `最後のシーンの時刻: ${summary.totalSeconds}秒`,
    `出演: ${summary.dancerNames.join("、")}（${summary.dancerNames.length}人）`,
    "",
    "各シーン(センターが0。散り=全員を囲む枠の大きさ、重心の正は上手/客席側。1マス=90cm):",
  ];

  for (const scene of summary.scenes) {
    const parts = [
      `${scene.number}. 「${scene.name}」 ${scene.timeSeconds}秒`,
      scene.segmentSeconds !== null ? `前から${scene.segmentSeconds}秒` : "先頭",
      `${scene.dancerCount}人`,
      `散り 横${scene.spreadX}×奥${scene.spreadY}`,
      `重心 x=${scene.centreX}, y=${scene.centreY}`,
    ];
    if (scene.facts.hiddenDancers.length > 0) {
      parts.push(`顔被り: ${scene.facts.hiddenDancers.join("、")}`);
    }
    if (scene.facts.fastMoves.length > 0) {
      parts.push(
        `速すぎる移動: ${scene.facts.fastMoves
          .map((move) => `${move.name}(${move.meters}mを${move.seconds}秒)`)
          .join("、")}`,
      );
    }
    lines.push(`- ${parts.join(" / ")}`);
  }

  return lines.join("\n");
}
