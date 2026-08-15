/**
 * 画面の段。**Web版は `useIsWideScreen` が持っている**が、ネイティブ版に
 * その部品は無い（`useWindowDimensions` で幅を見る）。境目の値は同じ
 * （768 / 1200）なので、寸法の表はそのまま使える。
 */
export type ScreenKind = "phone" | "tablet" | "desktop";

/** 画面幅から段を決める。境目は Web版と同じ */
export function screenKindFor(width: number): ScreenKind {
  if (width >= 1200) return "desktop";
  if (width >= 768) return "tablet";
  return "phone";
}

/**
 * 時間軸の寸法を、画面の段ごとに【1つのオブジェクトにまとめて】持つ。
 *
 * ■ なぜ Tailwind のクラス分岐にしないのか
 * コマの幅・帯の高さ・縮退の閾値・既定倍率は、互いに噛み合っている。
 * 「コマの幅＋4px 以上あればコマのまま置ける」という規則は、コマの幅を
 * 変えたら閾値も変わるということでもある。クラス分岐で書くと、この
 * 3つが別々の場所に散り、片方だけ直したときに必ずずれる。
 *
 * ここを唯一の出どころにして、CSS 側は高さや余白のような
 * 「数として使わないもの」だけを持つ。
 */
export type TimelineLayout = {
  /** 帯の高さ */
  bandHeight: number;
  /** 中央の幕(コマの通り道)の高さ */
  scrimHeight: number;
  /** コマの幅 */
  cardWidth: number;
  /** 選択中のコマの幅 */
  selectedCardWidth: number;
  /** コマの下端に番号と名前の帯を出すか。72px あれば6〜8文字入る */
  showCardName: boolean;
  /** ミニマップを出すか */
  showMinimap: boolean;
  /** 倍率の ＋ − ボタンを出すか */
  showZoomButtons: boolean;
};

/**
 * ■ ミニマップを PC で出さない理由
 * PC は左のパネルにシーン一覧が常時見えていて、「曲全体のどこにいるか」は
 * そこで分かる。同じ情報を2か所に出さない。スマホは一覧が上スワイプの
 * シートに隠れているのでミニマップが唯一の全体像、タブレットは一覧が
 * 見えていても幅が足りないので残す。
 *
 * ■ ＋ − ボタンを PC でだけ出す理由
 * 倍率を変える手立てがピンチだけだと、マウスしかない環境で一度寄せたら
 * 二度と引けない(倍率は作品ごとに覚えるので、開き直しても寄ったまま)。
 * Ctrl＋ホイールも効くが、それを知らないと詰む。
 */
export const TIMELINE_LAYOUT: Record<ScreenKind, TimelineLayout> = {
  phone: {
    // ■ スマホの帯を厚くしてある理由
    // ステージは横幅で頭打ちになる(14:10 の比率を保つため)。390px の
    // 画面ではステージは 230px にしかならず、その上下に 316px が
    // 何も置かずに余っていた。余りを帯へ回すと、コマが読める大きさに
    // なってもステージは 1px も小さくならない。
    // 帯を厚くしたぶんは、コマの上下に出る波形に回る。曲のどこを見ているかが
    // 読めるようになる(以前は帯80のうち40が幕で、波形がほとんど見えなかった)
    bandHeight: 128,
    scrimHeight: 60,
    // コマの大きさは【幅】で決まる。高さは幅×ステージの比なので、
    // 幕を高くしてもコマは大きくならない。PCと同じ大きさまで広げる。
    // 広げすぎると縮退(コマ→点)が早まる — 76 なら 80px/3.33秒 で、
    // シーンの既定の間隔(4秒 = 120BPMの8カウント)より内側に収まる
    cardWidth: 76,
    selectedCardWidth: 88,
    // 幅が広がったぶん、番号と名前の帯が載せられるようになった
    showCardName: true,
    showMinimap: true,
    showZoomButtons: false,
  },
  tablet: {
    bandHeight: 84,
    scrimHeight: 56,
    cardWidth: 58,
    selectedCardWidth: 70,
    showCardName: false,
    showMinimap: true,
    showZoomButtons: false,
  },
  desktop: {
    bandHeight: 96,
    scrimHeight: 64,
    cardWidth: 72,
    selectedCardWidth: 84,
    showCardName: true,
    showMinimap: false,
    showZoomButtons: true,
  },
};

/**
 * PC でコマの下端に出す、番号と名前の帯の高さ。
 *
 * コマの高さを増やすのではなく、絵の下端に【重ねる】。増やすと
 * 72×54 という確定寸法から外れ、中央の幕からもはみ出す。
 * 隠れるのはステージ最前列の一部だけで、PC では左のパネルに
 * 大きいミニチュアが常時出ているため、ここで失うものは小さい。
 */
export const CARD_NAME_BAR_HEIGHT = 16;

/**
 * コマの高さの上限。
 *
 * 幕(コマの通り道)より 4px だけ大きい。仕様の確定寸法である
 * スマホの選択中 56×42 は、40px の幕に対して上下 1px ずつはみ出す。
 * 幕でぴったり切ると、その 42 が作れない。
 */
export function maxCardHeight(layout: TimelineLayout): number {
  return layout.scrimHeight + 4;
}

/**
 * コマのまま置いておける最小の間隔(px)。
 *
 * コマの幅そのものだと隣とちょうど接してしまうので、4px だけ足す。
 * この値が画面の段によって変わるため、縮退の閾値も段ごとに変わる
 * (スマホ 2.1秒 / タブレット 1.7秒 / PC 2.1秒)。
 */
export function cardMinGapPx(layout: TimelineLayout): number {
  return layout.cardWidth + 4;
}
