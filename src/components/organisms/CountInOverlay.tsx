"use client";

import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 数えている最中か */
  isCountingIn: boolean;
  /** 残りの拍 */
  remainingBeats: number;
  /** 押すと数えるのをやめる。再生ボタンをもう一度押すのと同じ */
  onCancel: () => void;
};

/**
 * 予備拍(カウントイン)を画面の真ん中に大きく出す。
 *
 * ■ なぜ再生ボタンの中から出したのか
 * 以前は再生ボタンの中に数字を出していた。ボタンは 48px の丸で、稽古場で
 * 少し離れた場所から見るには小さすぎるうえ、**画面のいちばん下**にある。
 * 構えながら見る数字が視界の隅にあると、数えている実感が出ない。
 * 映画の頭に出るカウントダウンと同じで、**画面ごと数える**方が伝わる。
 *
 * ■ まわりを沈める
 * 数えている間はどこも触らせない(触れるのは「やめる」だけ)。数字が出て
 * いるのに隊形を動かせると、動き出した瞬間に自分の操作と再生のどちらが
 * 効いたのか分からなくなる。幕は薄め — 隊形が透けて見えていないと、
 * 何が始まるのかを構えられない。
 */
export function CountInOverlay({
  isCountingIn,
  remainingBeats,
  onCancel,
}: Props) {
  const t = useT();
  if (!isCountingIn) return null;

  return (
    /* 画面ぜんぶを覆う。押すとやめる — 数えている最中の唯一の操作なので、
       小さな×を探させずに、どこを押してもやめられるようにする */
    <button
      type="button"
      onClick={onCancel}
      aria-label={t.editor.dock.cancelCountIn}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-gutter bg-scrim/55 backdrop-blur-[1px]"
    >
      {/* 拍ごとに key を変えて、数字が変わるたびに入場のアニメーションを
          やり直させる。数が減っていることが動きでも分かる */}
      <span
        key={remainingBeats}
        data-testid="count-in-beat"
        role="status"
        aria-live="assertive"
        className="count-in-beat font-mono text-[22vmin] leading-none font-bold tabular-nums text-fg-strong"
      >
        {remainingBeats}
      </span>
      <span className="text-label text-fg-sub">
        {t.editor.dock.cancelCountIn}
      </span>
    </button>
  );
}
