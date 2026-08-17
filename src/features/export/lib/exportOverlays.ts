import { sceneSpanAt, type PositionsBySceneId } from "@/features/viewer/lib/interpolate";
import type { Scene } from "@/features/scene/types";

/**
 * 動画に重ねるもの(バミリ・導線)を組み立てる。
 *
 * ■ なぜ切り出したか
 * 録画の本体(recordVideo)は canvas と MediaRecorder に触るので、
 * テストから呼べない。**どの点を打ち、どの線を引くか**という判断だけを
 * ここへ出しておけば、そこは確かめられる。
 * 顔被りは既に純粋な関数(blindSpot.ts)なので、そのまま呼ぶだけ。
 */

export type StagePoint = { x: number; y: number };

export type ExportPath = {
  from: StagePoint;
  to: StagePoint;
  control?: StagePoint;
  color: string;
};

/**
 * バミリ。全シーンの立ち位置を1つの配列にする。
 *
 * **時刻によらず同じ**なので、書き出しの前に1回だけ組む。
 * 1コマごとに組み直すと、人数×シーン数の配列を毎フレーム作ることになる。
 */
export function buildStageMarks(
  positionsBySceneId: PositionsBySceneId,
): StagePoint[] {
  return Object.values(positionsBySceneId).flatMap((byDancer) =>
    Object.values(byDancer).map((position) => ({
      x: position.xCoordinate,
      y: position.yCoordinate,
    })),
  );
}

/**
 * 導線。その時刻が属する区間の「誰がどこからどこへ」。
 *
 * ■ 制御点は【行き先側】に入っている
 * 曲線は区間ごとに1つで、後ろ側のシーンの position に保存されている
 * (画面側の PathOverlay と同じ約束)。ここを取り違えると、曲げた導線が
 * 1つ手前の区間に出る。
 *
 * ■ 片側にしか居ない人は線を引かない
 * そのシーンから入る人・そのシーンで抜ける人は、行き先か出発点のどちらかが
 * 無い。無い側を(0,0)などで埋めると、舞台の隅から伸びる線が生える。
 */
export function buildPaths(
  scenes: Scene[],
  positionsBySceneId: PositionsBySceneId,
  seconds: number,
  colorOf: (dancerId: string) => string | null,
): ExportPath[] {
  const span = sceneSpanAt(scenes, seconds);
  if (!span?.to) return [];

  const from = positionsBySceneId[span.from.id] ?? {};
  const to = positionsBySceneId[span.to.id] ?? {};

  return Object.entries(to).flatMap(([dancerId, target]) => {
    const start = from[dancerId];
    if (!start) return [];
    const color = colorOf(dancerId);
    if (!color) return [];

    const hasCurve =
      target.curveControlX != null && target.curveControlY != null;

    return [
      {
        from: { x: start.xCoordinate, y: start.yCoordinate },
        to: { x: target.xCoordinate, y: target.yCoordinate },
        control: hasCurve
          ? { x: target.curveControlX as number, y: target.curveControlY as number }
          : undefined,
        color,
      },
    ];
  });
}
