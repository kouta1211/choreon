import type { ScreenKind } from "@/components/hooks/useIsWideScreen";

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
  cardLaneHeight: number;
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
    cardLaneHeight: 60,
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
    cardLaneHeight: 56,
    cardWidth: 58,
    selectedCardWidth: 70,
    showCardName: false,
    showMinimap: true,
    showZoomButtons: false,
  },
  desktop: {
    bandHeight: 96,
    cardLaneHeight: 64,
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
 * コマの通り道より 4px だけ大きい。仕様の確定寸法であるスマホの選択中
 * 56×42 は、40px の通り道に対して上下 1px ずつはみ出す。
 * 通り道でぴったり切ると、その 42 が作れない。
 *
 * （2026-08-22 まで、この通り道には暗い幕を敷いていた。波形が読めなく
 * なるので外した — 名前だけ `scrimHeight` から変えてある）
 */
export function maxCardHeight(layout: TimelineLayout): number {
  return layout.cardLaneHeight + 4;
}

/**
 * コマのまま置いておける最小の間隔(px)。
 *
 * ■ 半分ずつ足す
 * コマは時刻の**真上に中心を置く**ので、隣り合う2つがぶつからない距離は
 * 「それぞれの幅の半分の和」。両方が通常の幅なら `cardWidth` と同じだが、
 * **選択中のコマだけ一回り大きい**ので、そちらを見込んでおかないと
 * 選んだコマがその場で隣へ食い込む（実機の報告 2026-08-19。
 * PC なら (76+88)/2 = 82 要るところを 76 で判定していた）。
 *
 * 接するのを避けるため、さらに 4px 足す。
 * この値が画面の段によって変わるため、縮退の閾値も段ごとに変わる。
 */
export function cardMinGapPx(layout: TimelineLayout): number {
  return (layout.cardWidth + layout.selectedCardWidth) / 2 + 4;
}

/**
 * 振付を曲へ載せるバーの高さ（2026-08-26・第3段）。
 *
 * **帯の上端に細く敷く。** ここを厚くすると波形が読めなくなる
 * （波形は「曲の形」で、そこにしか無い情報）。掴む的としては細いが、
 * 横に長い帯なので指でも狙える。
 */
export const SPAN_HEIGHT_PX = 12;
