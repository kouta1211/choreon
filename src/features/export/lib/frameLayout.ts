/**
 * 動画の1コマの中で、ステージをどこに置くか。
 *
 * ステージの縦横比(作品ごとに違う)と、動画の縦横比(16:9)は一致しない。
 * 引き伸ばすと隊形が別の形になってしまうので、比を保ったまま中に収め、
 * 余った側に余白を置く。
 */

export type FrameRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 1マスあたりの画素数。ダンサーの大きさもここから決める */
  unit: number;
};

/**
 * @param padding 画面の縁に残す割合(0〜0.5)。ダンサーが端に立つ作品でも
 *                マーカーが切れないようにする
 */
export function stageRect(
  frameWidth: number,
  frameHeight: number,
  stageWidth: number,
  stageHeight: number,
  padding = 0.06,
): FrameRect {
  const availableWidth = frameWidth * (1 - padding * 2);
  const availableHeight = frameHeight * (1 - padding * 2);

  // 幅と高さのどちらが先に詰まるかで決まる
  const unit = Math.min(
    availableWidth / stageWidth,
    availableHeight / stageHeight,
  );
  const width = unit * stageWidth;
  const height = unit * stageHeight;

  return {
    x: (frameWidth - width) / 2,
    y: (frameHeight - height) / 2,
    width,
    height,
    unit,
  };
}

/**
 * 何コマ書き出すか、それぞれ何秒目か。
 *
 * 先頭のシーンから最後のシーンまで。最後のコマは必ず入れる
 * (割り切れないと、最後の隊形が一瞬だけ出て終わる、または出ないため)。
 */
export function frameTimes(
  fromSeconds: number,
  toSeconds: number,
  fps: number,
): number[] {
  if (!(fps > 0) || toSeconds <= fromSeconds) return [fromSeconds];

  const times: number[] = [];
  const step = 1 / fps;
  for (let t = fromSeconds; t < toSeconds; t += step) {
    times.push(Math.round(t * 1000) / 1000);
  }
  times.push(toSeconds);
  return times;
}
