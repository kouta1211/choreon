"use client";

import { RotateCcwSquare } from "lucide-react";
import { Phrase } from "@/components/atoms/Phrase";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * スマホを横にして閲覧画面を開いた人に、縦へ戻してもらう板。
 *
 * ■ なぜ出すのか（実機の報告 2026-08-19）
 * user から「横画面は使いづらいので、横画面の対応を外してもいい」。
 * 閲覧画面は**縦スクロールで道順を読む**作りで、横にすると
 * ステージだけで画面が埋まり、下の道順が1行も見えない。
 * 中途半端に見せるより、縦に戻してもらう方が早い。
 *
 * ■ 出し分けは CSS だけ（`NarrowScreenNotice` と同じ理由）
 * JavaScript で画面の向きを見て出し分けると、サーバー側には向きが無いので
 * **一度描いてから入れ替わる**（ちらつく）。向きで決まるものは向きで出し分ける。
 *
 * ■ 高さでも絞る
 * `orientation: landscape` だけだと、PC のブラウザも横向き扱いになる。
 * **横で、かつ背が低い（500px 以下）**ときだけに絞って、スマホの横持ちだけを
 * 拾う（タブレットは横でも十分な高さがあるので出ない）。
 *
 * ■ 出し分けは素の CSS（`globals.css` の `.landscape-only`）
 * Tailwind の任意メディアクエリでも書けるが、空白の入れ方を1つ間違えると
 * **CSS がまるごと落ちる**（docs/lessons_learned.md）。向きで分けるのは
 * ここ1箇所なので、確実な方を採った。
 *
 * ■ 逃げ道を作らない
 * 端末を回せば必ず抜けられるので、選ばせる意味が無い。
 * 作成画面の板（`NarrowScreenNotice`）も、2026-08-20 に逃げ道を閉じた
 * ので、いまはどちらも「抜ける道は1つだけ」で揃っている。
 */

export function RotateToPortraitNotice() {
  const t = useT();

  return (
    <div
      role="dialog"
      /* aria-modal は付けない。後ろを不活性にしているわけではなく、
         端末を回せばそのまま元の画面に戻るだけなので */
      aria-label={t.viewer.rotate.title}
      className="landscape-only fixed inset-0 z-[70] flex-col items-center justify-center bg-page px-gutter text-center"
    >
      {/* 地の上に直接置かず、他の浮きものと同じ素材の板へ載せる
          （`NarrowScreenNotice` と同じ理由。2026-08-20） */}
      <div className="overlay-panel flex w-full max-w-xs flex-col items-center gap-gutter rounded-2xl p-gutter-lg">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-fg-sub"
        >
          <RotateCcwSquare size={26} />
        </span>

        <div className="flex flex-col gap-unit">
          <h1 className="text-title text-fg-strong">{t.viewer.rotate.title}</h1>
          <p className="text-label leading-relaxed text-fg-sub">
            <Phrase>{t.viewer.rotate.body}</Phrase>
          </p>
        </div>
      </div>
    </div>
  );
}
