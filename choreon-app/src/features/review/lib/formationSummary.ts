/**
 * 隊形を、AIへ渡せる短い説明に畳む。
 *
 * ■ 座標をセンター原点に直す
 * 保存されている座標は左上を原点にした 0〜幅 / 0〜高さ。人が舞台を語る
 * ときの基準はセンターで、「センターから下手へ2マス」のように言う。
 * バミリ(客席側の目盛り)も 0 を中心に振ってある。原点が違うまま渡すと、
 * 返ってくる指摘も左上基準になり、画面と照らし合わせられない。
 *
 * ■ 警告の数値はアプリが出す
 * 「この移動は速すぎる」「この人は前の人に隠れる」は、距離と秒数から
 * 決まる【計算で出る事実】で、推測させるものではない。AIに数えさせると
 * 数字を作ってしまう。こちらで出した結果を渡し、AIには
 * 「その事実をどう解釈するか」だけを任せる。
 */

import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";

export type FormationSummary = {
  sceneName: string;
  /** 曲の何秒目か */
  timeSeconds: number;
  /** 前のシーンからの移動にかけられる秒数。先頭なら null */
  segmentSeconds: number | null;
  /** センター原点に直した立ち位置 */
  dancers: {
    name: string;
    /** 正が上手(客席から見て右)、負が下手 */
    x: number;
    /** 正が客席側、負がバックステージ側 */
    y: number;
    /** 0が客席向き。45度刻み */
    facing: number;
  }[];
  /** アプリが計算で出した事実。AIに数えさせない */
  facts: {
    hiddenDancers: string[];
    fastMoves: { name: string; meters: number; seconds: number }[];
  };
};

/** 左上原点の座標を、センター原点へ直す */
export function toCentreOrigin(
  position: { xCoordinate: number; yCoordinate: number },
  stageWidth: number,
  stageHeight: number,
): { x: number; y: number } {
  return {
    x: round(position.xCoordinate - stageWidth / 2),
    y: round(position.yCoordinate - stageHeight / 2),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildFormationSummary(input: {
  scene: Scene;
  previousScene: Scene | null;
  nextScene: Scene | null;
  dancers: Record<string, Dancer>;
  positions: Record<string, Position>;
  nextPositions: Record<string, Position>;
  stageWidth: number;
  stageHeight: number;
}): FormationSummary {
  const {
    scene,
    previousScene,
    nextScene,
    dancers,
    positions,
    nextPositions,
    stageWidth,
    stageHeight,
  } = input;

  const named = Object.values(positions).flatMap((position) => {
    const dancer = dancers[position.dancerId];
    if (!dancer) return [];
    const { x, y } = toCentreOrigin(position, stageWidth, stageHeight);
    return [
      {
        name: dancer.name,
        x,
        y,
        facing: Math.round(position.rotationAngle),
      },
    ];
  });

  const hidden = findBlockedDancerIds(positions);
  const segmentSeconds = nextScene
    ? nextScene.timeSeconds - scene.timeSeconds
    : null;
  const fast =
    nextScene && segmentSeconds
      ? findExcessiveMoves(positions, nextPositions, segmentSeconds)
      : new Map();

  return {
    sceneName: scene.name,
    timeSeconds: round(scene.timeSeconds),
    segmentSeconds: previousScene
      ? round(scene.timeSeconds - previousScene.timeSeconds)
      : null,
    dancers: named,
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
}

/**
 * AIへ渡す本文。JSONのまま投げるより、日本語の箇条書きにした方が
 * 返ってくる文も日本語として自然になる。
 */
export function formatSummaryForPrompt(summary: FormationSummary): string {
  const lines = [
    `シーン名: ${summary.sceneName}`,
    `曲の位置: ${summary.timeSeconds}秒`,
    summary.segmentSeconds !== null
      ? `前のシーンからの移動時間: ${summary.segmentSeconds}秒`
      : "これは最初のシーンです",
    "",
    "立ち位置(センターが0。xは正が上手・負が下手、yは正が客席側・負が奥。1マス=90cm):",
    ...summary.dancers.map(
      (dancer) =>
        `- ${dancer.name}: x=${dancer.x}, y=${dancer.y}, 向き=${dancer.facing}度`,
    ),
  ];

  if (summary.facts.hiddenDancers.length > 0) {
    lines.push(
      "",
      `アプリが検出した顔被り: ${summary.facts.hiddenDancers.join("、")}`,
    );
  }
  if (summary.facts.fastMoves.length > 0) {
    lines.push(
      "",
      "アプリが検出した速すぎる移動:",
      ...summary.facts.fastMoves.map(
        (move) => `- ${move.name}: ${move.meters}m を ${move.seconds}秒`,
      ),
    );
  }

  return lines.join("\n");
}
