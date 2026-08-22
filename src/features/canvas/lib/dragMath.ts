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

/**
 * 吸着する刻み(ユニット)。**線の上だけでなく、線と線のあいだにも寄せる**
 * （実機の要望 2026-08-22）。
 *
 * 1ユニット = 約90cm なので、0.5 は**約45cm**。並んで立つ人の間に
 * もう1人を入れる、という置き方が格子のまま作れるようになる。
 * ここを 0.25 のように細かくすると、刻みの意味（狙って揃う）が薄れる。
 */
export const GRID_SNAP_STEP = 0.5;

/**
 * 値をいちばん近い吸着先(0.5の倍数)へ乗せる。
 *
 * ■ **「近ければ寄る」ではなく「必ず乗る」**（user の指示 2026-08-22:
 * 「格子状の線上、または線と線の間にしか置けないようにしたい」）
 * 以前は刻みから 0.1 以内のときだけ寄せる磁石式で、そのぶん
 * **刻みに乗っていない中途半端な位置にも置けた**。揃えたつもりで
 * 揃っていない、が起きる。
 *
 * ■ **掴んでいる間は通さない**（仕様。2026-08-22）
 * 指にはそのまま付いてきて、乗るのは**置いた瞬間だけ**。
 * 掴んでいる間から吸い付くと、運んでいる手つきが跳ねて読めない。
 * 切り替える設定は置かない — **これがこのアプリの置き方**。
 */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SNAP_STEP) * GRID_SNAP_STEP;
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
