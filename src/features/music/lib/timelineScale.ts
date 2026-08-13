/**
 * 時間軸の「1秒を何pxで描くか」と、それに伴う置き場所の計算。
 *
 * ■ 倍率を自動で決めない理由
 * 「曲全体が1画面に収まるように倍率を計算する」ことはできるが、そうすると
 * 3分の曲と30秒の曲で【指1本ぶんが何秒か】が変わる。同じ距離だけ指を
 * 動かしても進む量が曲ごとに違うと、感覚が身に付かない。
 *
 * そこで倍率は固定にし、既定を 1秒=24px にする(窓が15秒ぶん)。
 * 全体を眺めたいときはミニマップがあり、細かく置きたいときはピンチで
 * 広げられる。曲の長さは倍率ではなく「軸の長さ」の側で吸収する。
 */

import { TIMELINE_LAYOUT } from "@/features/music/lib/timelineLayout";

/** 引きの限界。1画面(360px)に45秒 */
export const MIN_PX_PER_SECOND = 8;
/** 寄りの限界。1画面に3秒。0.1秒(最小の間隔)が12px */
export const MAX_PX_PER_SECOND = 120;
/** 帯の幅が測れないうちに使う値(サーバー描画の1フレーム目など) */
export const DEFAULT_PX_PER_SECOND = 24;

/**
 * 既定倍率が取りうる段。中途半端な倍率にしないための丸め先。
 *
 * 段にするのは、画面幅が数px違うだけで倍率が変わると、同じ作品を
 * 別の端末で開いたときに「同じところを見ているのに縮尺が違う」状態が
 * 際限なく生まれるため。
 */
export const ZOOM_STEPS = [12, 24, 36, 48, 72, 96] as const;

/**
 * 帯の実幅から既定倍率を決める。
 *
 * ■ 画面幅ではなく【帯の実幅】で決める理由
 * 3ペインのPCでは、左268px・右300pxのパネルが両側を食う。
 * その結果 1200px のPCの帯(563px)は、900px のタブレットの帯(627px)
 * より狭い。「画面が広いから倍率を上げる」という素直な規則だと、
 * PC でだけ引きすぎになる。
 *
 * 狙いは【窓に入る秒数を 15〜18秒に揃える】こと。どの画面でも
 * 「ひと払いぶん ≒ 4秒」の感覚が変わらないようにする。
 */
export function defaultPxPerSecond(bandWidth: number): number {
  if (!Number.isFinite(bandWidth) || bandWidth <= 0) {
    return DEFAULT_PX_PER_SECOND;
  }
  const target = bandWidth / 16;
  return ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - target) < Math.abs(best - target) ? step : best,
  );
}

/**
 * 再生中、再生ヘッドを窓のどこに置くか。
 * 中央(0.5)より少し左にするのは、これから来る隊形を見る時間が要るため。
 */
export const PLAYHEAD_ANCHOR = 0.43;

/**
 * 曲の頭(0秒)の手前に空ける余白。
 *
 * これが無いと、0秒に置いたシーンのコマは中心が軸の原点に来るため、
 * 左半分が切れる。先頭のシーンはどの作品にも必ずあるので、
 * 「いちばん最初の隊形だけ読めない」ことになる。
 *
 * 【軸の座標はこの余白を含む】。0秒は軸の 0px ではなく この余白ぶん先にある。
 * 位置の計算は必ず axisX / axisSecondsAt を通し、掛け算を直に書かない
 * (書くと、余白を足し忘れた箇所だけが半コマずれる)。
 *
 * 数を直に置かずコマの幅から出しているのは、以前 30px の固定値だったとき、
 * 選択中のコマ(PC 84px)の半分に足りず、先頭のコマが 12px 切れていたため。
 * コマの幅を変えるたびにここを直す、という決まりは必ず忘れられる。
 * 4px は、切れていないことが目で分かるだけの隙間。
 */
const WIDEST_SELECTED_CARD_PX = Math.max(
  ...Object.values(TIMELINE_LAYOUT).map((layout) => layout.selectedCardWidth),
);
export const LEAD_IN_PX = Math.ceil(WIDEST_SELECTED_CARD_PX / 2) + 4;

/** その時刻が軸の何pxに来るか */
export function axisX(seconds: number, pxPerSecond: number): number {
  return LEAD_IN_PX + seconds * pxPerSecond;
}

/** 軸の何pxが何秒にあたるか。axisX の逆 */
export function axisSecondsAt(x: number, pxPerSecond: number): number {
  if (pxPerSecond <= 0) return 0;
  return (x - LEAD_IN_PX) / pxPerSecond;
}

/** これ以上あれば旗(番号だけ)にできる。下回ると束ねる。
 * コマと違って中身が番号だけなので、画面の段によらず同じ */
export const FLAG_MIN_GAP_PX = 26;

export function clampPxPerSecond(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PX_PER_SECOND;
  return Math.min(MAX_PX_PER_SECOND, Math.max(MIN_PX_PER_SECOND, value));
}

/**
 * 軸の長さ(px)。曲の長さと、最後のシーンの位置の【長い方】に合わせる。
 *
 * 曲より後ろにシーンを置くこともできる(曲を差し替える前に組む場合など)。
 * そのときに軸が曲の終わりで切れていると、置いたシーンへ辿り着けない。
 * 末尾に窓半分ぶんの余白を足して、最後のシーンを画面の中ほどまで
 * 引っ張って来られるようにする。
 */
export function contentWidth(
  totalSeconds: number,
  pxPerSecond: number,
  viewportWidth: number,
): number {
  return Math.max(
    viewportWidth,
    LEAD_IN_PX + totalSeconds * pxPerSecond + viewportWidth / 2,
  );
}

/** はみ出さない範囲へ収める */
export function clampScrollX(
  scrollX: number,
  content: number,
  viewport: number,
): number {
  if (!Number.isFinite(scrollX)) return 0;
  return Math.min(Math.max(0, content - viewport), Math.max(0, scrollX));
}

/** その時刻が窓の定位置(PLAYHEAD_ANCHOR)へ来るスクロール量 */
export function scrollForSeconds(
  seconds: number,
  pxPerSecond: number,
  viewport: number,
  content: number,
): number {
  return clampScrollX(
    axisX(seconds, pxPerSecond) - viewport * PLAYHEAD_ANCHOR,
    content,
    viewport,
  );
}

/**
 * ピンチの前後で【指の下の時刻が動かない】ようにするスクロール量。
 *
 * 倍率だけ変えると、つまんだ場所ではなく軸の左端を軸に伸び縮みする。
 * 見たかった箇所が画面の外へ逃げるので、指の位置を固定点にする。
 */
export function scrollAfterZoom(
  scrollX: number,
  anchorX: number,
  previousPxPerSecond: number,
  nextPxPerSecond: number,
): number {
  const seconds = axisSecondsAt(scrollX + anchorX, previousPxPerSecond);
  return Math.max(0, axisX(seconds, nextPxPerSecond) - anchorX);
}

/** シーンを軸の上でどう見せるか */
export type TimelineItemKind = "card" | "flag" | "cluster";

export type TimelineItem = {
  kind: TimelineItemKind;
  /** 含まれるシーンの番号。card / flag は1つ、cluster は2つ以上 */
  indexes: number[];
  /** 置く時刻。cluster は含まれるシーンの中間 */
  seconds: number;
};

/**
 * 詰まっているところを縮退させる。コマ → 旗 → 束ね。
 *
 * ■ 左隣との距離だけで決める理由
 * 前後の両方を見て決めると、間隔の違う3つが並んだときに真ん中の1つだけが
 * 落ち、倍率を少し変えるたびに落ちる相手が入れ替わって、ちらついて見える。
 * 「左隣より近ければ縮む」という一方向の規則なら、倍率に対して単調に変わる。
 *
 * ■ 縮退は見た目の話でしかない
 * 0.5秒間隔でも、ピンチで 120px/秒 まで開けば 60px あき、コマのまま読める。
 * ここで決めているのは【引きで眺めているときにどう見せるか】であって、
 * 置ける間隔を制限しているわけではない。
 */
export function degradeScenes(
  times: number[],
  pxPerSecond: number,
  cardMinGapPx: number,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  times.forEach((seconds, index) => {
    // 先頭には左隣が無いので、必ずコマのまま
    const gapPx =
      index === 0 ? Infinity : (seconds - times[index - 1]) * pxPerSecond;

    if (gapPx >= cardMinGapPx) {
      items.push({ kind: "card", indexes: [index], seconds });
      return;
    }
    if (gapPx >= FLAG_MIN_GAP_PX) {
      items.push({ kind: "flag", indexes: [index], seconds });
      return;
    }

    // 直前の項目を巻き込んで束ねる。「4シーン」と数えるとき、
    // 巻き込まれた側も数のうちに入っていないと辻褄が合わない
    const previous = items[items.length - 1];
    if (!previous) {
      items.push({ kind: "cluster", indexes: [index], seconds });
      return;
    }
    previous.kind = "cluster";
    previous.indexes.push(index);
    previous.seconds =
      (times[previous.indexes[0]] +
        times[previous.indexes[previous.indexes.length - 1]]) /
      2;
  });

  return items;
}
