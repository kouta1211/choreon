import type { Dancer } from "@/features/dancer/types";
import type { Position } from "@/features/scene/types";

/** ミニチュアの中の点1つ。位置は0〜1の割合で持つ(実際の表示px数は
 * 置き場所によって64〜78pxと違うため、ここでは決めない) */
export type ThumbnailDot = {
  /** 左からの位置(0〜1) */
  x: number;
  /** 上からの位置(0〜1) */
  y: number;
  /** 実際に塗る色。`var(--dancer-1)` のようなCSS変数は使えない
   * (dataURLの中のSVGからは、それを貼っているページのCSSが見えない) */
  color: string;
};

/** SVGの横幅の基準。縦はステージの縦横比から決める */
const VIEWBOX_WIDTH = 100;

/** 点の半径(VIEWBOX_WIDTH に対する比)。以前はpx固定で、
 * 78px以上のときだけ5px→7pxに切り替えていた。比にすると
 * 置き場所の大きさに応じて滑らかに変わるので、切り替えの段が要らない */
const DOT_RADIUS_RATIO = 0.04;

/**
 * シーン1コマ分の点の位置と色を出す。
 *
 * 色の読み替え(themedDancerColor)はここではやらない。あれはCSS変数名を
 * 返す関数で、dataURLに焼くと何色なのか分からない文字列になるため。
 * 代わりに「実際の色に直す関数」を受け取る。テストでは素通しの関数を
 * 渡せばよく、この関数自体はDOMに触らない純関数のままでいられる。
 */
export function buildThumbnailDots(
  positions: Record<string, Position>,
  dancers: Record<string, Dancer>,
  stageWidthUnits: number,
  stageHeightUnits: number,
  resolveColor: (dancerColor: string) => string,
): ThumbnailDot[] {
  const dots: ThumbnailDot[] = [];

  for (const position of Object.values(positions)) {
    const dancer = dancers[position.dancerId];
    // 削除されたダンサーの配置が残っていることがある。描くものが無い
    if (!dancer) continue;

    dots.push({
      x: position.xCoordinate / stageWidthUnits,
      y: position.yCoordinate / stageHeightUnits,
      color: resolveColor(dancer.color),
    });
  }

  return dots;
}

/**
 * 点だけを描いたSVGを dataURL にする。
 *
 * 背景と格子は含めない。それらを敷いているのは下の要素で、CSS変数から
 * 色を取っているためテーマを変えれば自動で追従する。dataURLに焼くと
 * その追従が効かなくなるので、**焼く範囲は点の色だけに絞っている**。
 *
 * base64にせず `encodeURIComponent` で済ませているのは、この文字列が
 * 保存されずメモリ上にしか無いため。読めるままの方が、開発中に
 * 「何が焼かれているか」をそのまま確認できる。
 */
export function buildThumbnailDataUrl(
  dots: ThumbnailDot[],
  stageWidthUnits: number,
  stageHeightUnits: number,
): string {
  const height = (VIEWBOX_WIDTH * stageHeightUnits) / stageWidthUnits;
  const radius = VIEWBOX_WIDTH * DOT_RADIUS_RATIO;

  const circles = dots
    .map(
      (dot) =>
        `<circle cx="${round(dot.x * VIEWBOX_WIDTH)}" cy="${round(dot.y * height)}" r="${round(radius)}" fill="${escapeAttribute(dot.color)}"/>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${round(height)}" preserveAspectRatio="none">${circles}</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 小数を短く。そのまま出すと 33.33333333333333 のような桁が並び、
 * 点の数だけdataURLが無駄に長くなる */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 色は保存データ由来の外部入力なので、属性を抜け出せる文字を潰しておく。
 * ここを素通しにすると、色の文字列にSVGを書き足せてしまう */
function escapeAttribute(value: string): string {
  return value.replace(/[<>"'&]/g, "");
}
