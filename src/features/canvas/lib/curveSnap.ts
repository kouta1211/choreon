/**
 * 導線の曲線ハンドルの自動補間（実機の報告 2026-08-19）。
 *
 * 格子への吸着（`snapToGrid`）・向きの8方位（`snapRotation`）と同じ考え方で、
 * **狙って合わせたい形の近くまで来たら、ぴったりに寄せる**。指先で
 * 「ちょうどまっすぐ」「ちょうど左右対称」を出すのは無理なのに、
 * 目では崩れているのがはっきり分かってしまう、というのが理由も同じ。
 *
 * 寄せ先は2つ。
 *
 * - **まっすぐ**（`straight`）… 制御点が始点と終点の中点に来ると、
 *   二次ベジェは直線になる。曲げるのをやめたいときの帰り道
 * - **左右対称**（`symmetric`）… 中点から**線に直交する向き**へ出た所。
 *   膨らみの量はそのままに、傾きだけを正す。ここを外すと、同じ弧に
 *   見えて片側だけ寄った「歪んだ曲線」になる
 *
 * ■ 格子への吸着の設定には縛られない
 * あの設定は「格子」の話で、ここは格子とは無関係（向きの8方位が
 * 縛られていないのと同じ）。
 */

type Point = { x: number; y: number };

/** 何に吸着したか。どこにも寄っていなければ null */
export type CurveSnapKind = "straight" | "symmetric" | null;

export type CurveSnapResult = {
  point: Point;
  kind: CurveSnapKind;
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 制御点を、まっすぐ／左右対称の近くまで来たら寄せる。
 *
 * どちらにも遠ければ、指の位置をそのまま返す（`snapToGrid` と同じ作法）。
 * **まっすぐが優先** — 中点の近くは対称の線の上でもあるので、先に見ないと
 * 「まっすぐにしたいのに、わずかに膨らんだまま止まる」ことになる。
 */
export function snapCurveControlPoint({
  point,
  from,
  to,
  tolerance,
}: {
  point: Point;
  /** 導線の始点（このシーンの立ち位置） */
  from: Point;
  /** 導線の終点（次のシーンの立ち位置） */
  to: Point;
  tolerance: number;
}): CurveSnapResult {
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  // 同じ場所なら線を引きようが無い（導線もそもそも描かれない）
  const span = distance(from, to);
  if (span === 0) return { point, kind: null };

  if (distance(point, midpoint) <= tolerance) {
    return { point: midpoint, kind: "straight" };
  }

  /* 中点を通り、線に直交する向きの単位ベクトル。
     制御点をこの線の上へ落とすと、膨らみの量を保ったまま左右対称になる */
  const normal = {
    x: -(to.y - from.y) / span,
    y: (to.x - from.x) / span,
  };
  const offset = { x: point.x - midpoint.x, y: point.y - midpoint.y };
  const along = offset.x * normal.x + offset.y * normal.y;
  const projected = {
    x: midpoint.x + normal.x * along,
    y: midpoint.y + normal.y * along,
  };

  if (distance(point, projected) <= tolerance) {
    return { point: projected, kind: "symmetric" };
  }

  return { point, kind: null };
}
