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

/**
 * 二次ベジェ曲線のうち、進捗t以降(まだ通っていない部分)だけを取り出す。
 * 1軸ぶんを扱うのはquadraticBezierAtと同じ。
 *
 * 二次ベジェを途中で切ると、残りもまた二次ベジェになる(de Casteljauの分割)。
 * そのため戻り値をそのまま新しい始点・制御点として使えば、SVGのQコマンド
 * 1つで「まだ通っていない残りの線」を描ける。終点は変わらないので返さない。
 *
 * 「導線を進んだぶんだけ消していく」演出(PathTrail)で、毎フレーム
 * 残りの線を引き直すために使う。元の曲線の一部をそのまま切り出しているので、
 * 消え際の線がダンサーの通り道からずれることがない。
 */
export function splitQuadraticAfter(
  from: number,
  control: number,
  to: number,
  t: number,
): { from: number; control: number } {
  return {
    from: quadraticBezierAt(from, control, to, t),
    // 制御点は元の制御点と終点をtで内分した点になる
    control: control + (to - control) * t,
  };
}
