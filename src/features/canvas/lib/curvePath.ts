/**
 * 二次ベジェ曲線 B(t) = (1-t)²P0 + 2(1-t)t·C + t²P1 上の座標を、
 * 1軸ぶん(xならx、yならy)だけ求める。tは0(始点)から1(終点)。
 *
 * PathOverlayがSVGのQコマンドで描いている曲線とまったく同じ式なので、
 * 同じ始点・制御点・終点を渡せば「線の上を動く」ことが保証される。
 *
 * 制御点が始点と終点のちょうど中点のときは、展開すると
 * B(t) = (1-t)P0 + t·P1 となり直線補間に一致する。つまりこの関数は
 * 直線移動を特別扱いする必要がなく、曲線の一種として素直に含んでいる。
 */
export function quadraticBezierAt(
  from: number,
  control: number,
  to: number,
  t: number,
): number {
  const inverse = 1 - t;
  return inverse * inverse * from + 2 * inverse * t * control + t * t * to;
}
