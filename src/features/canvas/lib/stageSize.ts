import { MARKER_SIZE } from "@/features/dancer/constants";

/**
 * 「空いている領域に、縦横比を保ったまま目一杯収まる幅」を返す。
 *
 * aspect-ratioと max-width/max-height の組み合わせでは表現できない。
 * 片方の軸が確定していると、もう片方が上限で詰められても再計算されず、
 * 比率が崩れるため(実測で 8x8 のステージが 420x441 になった)。
 * 比率が崩れると、％で置いているダンサーの位置がまとめてずれる。
 *
 * そこで「入る方の小さい側」をmin()で直接指定する。親に
 * container-type:size を付けてあるので、cqw/cqhで空き領域の縦横を参照できる。
 *
 * ■ 縁に立つ人のぶんを空けてある
 * ダンサーの丸は座標を中心に描くので、ステージの縁ぴったりに立つと
 * 半分(MARKER_SIZE / 2)が外へはみ出す。ステージを空き領域いっぱいに
 * 広げると、そのはみ出したぶんが画面の外に出て丸が欠けて見えた
 * (スマートフォンでは横幅で決まるため必ずこうなる)。
 * 左右に半径ぶんずつ空けておけば、縁に立っても丸が最後まで見える。
 *
 * ■ なぜ Stage.tsx から出したか
 * 読み込み中の骨格(loading.tsx)も同じ大きさで四角を描く必要がある。
 * あちらは Server Component なので "use client" の付いた Stage.tsx からは
 * 取れず、かといって同じ式を書き写すと、片方だけ直したときに
 * 「骨格と本物でステージの大きさが違う」という形でずれる
 * (実際、骨格が w-full のままだったため広い画面で別物になっていた)。
 */
export function stageWidthRule(
  widthUnits: number,
  heightUnits: number,
): string {
  return `min(calc(100cqw - ${MARKER_SIZE}px), calc((100cqh - ${MARKER_SIZE}px) * ${widthUnits} / ${heightUnits}))`;
}
