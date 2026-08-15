import { clamp, pixelDeltaToUnitDelta } from '@/features/canvas/lib/dragMath';

/**
 * 掴んでいる指の位置から、**吸い付く先の格子線**を求める。
 *
 * ■ なぜ要るのか
 * 吸着はドラッグの最中には見えない — 離してはじめて位置が動く。しかも
 * **指の下は指で隠れている**ので、どこへ着くのかが離すまで分からない。
 * マウスより手がかりが少ないぶん、触る画面ではここが効く。
 *
 * ■ 線は【画面】の座標で返す
 * 客席を上にしているとステージのYと画面のYが鏡になる。線を引くのは画面
 * なので、ここで画面の向きに直して返す（Web版 CanvasBoard と同じ）。
 *
 * ■ 切っているときは光らせない
 * 吸わないのに光ると「そこへ着く」という嘘の予告になる。
 *
 * ドラッグの最中に毎回呼ばれるので、純関数として切り出してある
 * （画面を触らないぶん、テストから素直に確かめられる）。
 */
export type SnapLine = { x: number | null; y: number | null };

export const NO_SNAP_LINE: SnapLine = { x: null, y: null };

export function snapLineFor({
  x,
  y,
  totalDx,
  totalDy,
  stageSize,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
  isSnapEnabled,
  tolerance,
}: {
  /** 掴む前のステージ座標 */
  x: number;
  y: number;
  /** 掴んでからの移動量（px） */
  totalDx: number;
  totalDy: number;
  /** ステージの実寸（px）。px をユニットへ直す比に要る */
  stageSize: { width: number; height: number };
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
  isSnapEnabled: boolean;
  /** ここより格子線に近ければ光らせる。吸着の判定と同じ値を渡す */
  tolerance: number;
}): SnapLine {
  const { width, height } = stageSize;
  if (!isSnapEnabled || width <= 0 || height <= 0) return NO_SNAP_LINE;

  const liveX = clamp(
    x + pixelDeltaToUnitDelta(totalDx, width, stageWidthUnits),
    0,
    stageWidthUnits,
  );
  // 掴む前の位置も画面の向きへ写してから足す（指は画面を動いているため）
  const screenY = isAudienceOnTop ? stageHeightUnits - y : y;
  const liveY = clamp(
    screenY + pixelDeltaToUnitDelta(totalDy, height, stageHeightUnits),
    0,
    stageHeightUnits,
  );

  return {
    x: isNearGridLine(liveX, tolerance) ? Math.round(liveX) : null,
    y: isNearGridLine(liveY, tolerance) ? Math.round(liveY) : null,
  };
}

function isNearGridLine(value: number, tolerance: number): boolean {
  return Math.abs(value - Math.round(value)) <= tolerance;
}
