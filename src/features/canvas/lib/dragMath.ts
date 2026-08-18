/**
 * dnd-kitのonDragEndで一度だけZustandへコミットする際に使う純粋関数群。
 * DOM/React/dnd-kitに依存しないためユニットテストしやすく、
 * DndContextの結線(CanvasBoard相当)を組む際にそのまま利用する想定。
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** dnd-kitのDragEndEvent.delta(px)を、ステージ座標系(0..unitsTotal)のdeltaに変換する */
export function pixelDeltaToUnitDelta(
  deltaPx: number,
  containerSizePx: number,
  unitsTotal: number,
): number {
  if (containerSizePx === 0) return 0;
  return (deltaPx / containerSizePx) * unitsTotal;
}

/** pixelDeltaToUnitDeltaの逆変換。ステージ座標系のdeltaをpx単位のdeltaへ戻す
 * (格子スナップ用のModifierが、スナップ後のユニット差分をdnd-kitのtransform(px)に
 * 書き戻すために使う) */
export function unitDeltaToPixelDelta(
  deltaUnits: number,
  containerSizePx: number,
  unitsTotal: number,
): number {
  if (unitsTotal === 0) return 0;
  return (deltaUnits / unitsTotal) * containerSizePx;
}

/** 値が最も近い整数(=格子線・交差点)からtolerance以内なら、その整数にぴったり
 * 吸着させる。ステージ座標系は1マス=1ユニットなので、整数座標は常に格子線上
 * (x, yどちらか一方が整数)または交差点(両方が整数)と一致する */
export function snapToGrid(value: number, tolerance: number): number {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= tolerance ? nearest : value;
}

/** 値が(浮動小数点誤差を許容して)整数とみなせるかどうか。格子スナップが
 * 実際に効いたかどうかを、スナップ処理を再現せず結果の値だけから判定するために使う
 * (連続的なポインタ移動が偶然ぴったり整数になることは実質無いため、
 * 「整数に極めて近い」=「スナップされた」とみなせる) */
export function isCloseToInteger(value: number, epsilon = 0.01): boolean {
  return Math.abs(value - Math.round(value)) < epsilon;
}

/** 向きを吸着させる刻み(度)。0/45/90…の8方向。上下左右と斜めは、
 * 「客席を向く」「下手を向く」のように言葉で言える向きなので、
 * 狙って合わせたい場面が多い */
export const ROTATION_SNAP_STEP_DEGREES = 45;

/** 刻みからこの範囲内なら吸着させる(度)。刻みの1/4弱。
 * 広すぎると中間の角度が作れなくなり、狭すぎると狙って合わせられない */
export const ROTATION_SNAP_TOLERANCE_DEGREES = 10;

/**
 * 向きを8方向へ吸着させる。近くなければ、指の角度をそのまま返す。
 *
 * 位置の格子スナップ(snapToGrid)と同じ考え方。ぴったりの角度は
 * 指先の精度では出せないが、目では「まっすぐか、少し傾いているか」が
 * はっきり分かってしまう。
 */
export function snapRotation(
  degrees: number,
  step: number = ROTATION_SNAP_STEP_DEGREES,
  tolerance: number = ROTATION_SNAP_TOLERANCE_DEGREES,
): number {
  const nearest = Math.round(degrees / step) * step;
  // 359度→360度のように、丸めた先が一周ぶん外へ出ることがある
  const normalized = ((nearest % 360) + 360) % 360;
  // 0度と359度のような、一周をまたいだ距離を正しく測る
  const distance = Math.abs(((degrees - normalized + 540) % 360) - 180);
  return distance <= tolerance ? normalized : degrees;
}

/**
 * まとめて動かすときに、**全員が収まる**ところまで縮めた移動量。
 *
 * 1人ずつ `clamp` すると、壁に当たった人だけそこで止まって
 * **隊形が潰れる**（4人の横一列を左へ寄せると、左端の人だけ先に止まって
 * 間隔が詰まる）。移動量の側を縮めれば、形を保ったまま端で止まる。
 *
 * 渡すのは動かす人たちの**いまの座標**。1人でも同じ式で通る。
 */
export function boundedGroupDelta(
  positions: { xCoordinate: number; yCoordinate: number }[],
  delta: { x: number; y: number },
  stage: { width: number; height: number },
): { x: number; y: number } {
  if (positions.length === 0) return { x: 0, y: 0 };

  const xs = positions.map((position) => position.xCoordinate);
  const ys = positions.map((position) => position.yCoordinate);

  return {
    x: clamp(delta.x, -Math.min(...xs), stage.width - Math.max(...xs)),
    y: clamp(delta.y, -Math.min(...ys), stage.height - Math.max(...ys)),
  };
}
