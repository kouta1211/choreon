import type { InputHTMLAttributes } from "react";

type Props = {
  /** 欄の名前。読み上げにも使うので、必ず渡す */
  label: string;
  /** 名前を目で見える形で出すか。sr-only にすると、読み上げにだけ残る */
  isLabelVisible?: boolean;
  /** 入れたものが受け取れなかったとき。枠を強くして aria-invalid を立てる */
  hasError?: boolean;
  /** 高さ。既定は 44px(触れる下限)、lg は 56px(主ボタンと同じ段) */
  size?: "md" | "lg";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

/**
 * 1行の入力欄。**この形が正で、画面ごとに組み直さない。**
 *
 * ■ なぜ部品にしたか(2026-08-20)
 * 同じ「1行の入力欄」が、ログイン・作品を作る欄・共有リンクを貼る欄で
 * **別々に組まれていた**。高さ(44/56)も、当たったとき(focus)の見え方も
 * バラバラで、画面を移ると別のアプリのように見えていた。
 *
 * ■ 失敗は【枠】で伝える
 * 面を赤くしない。赤い面は「危険」ではなく「誰かの色」に見える
 * (ステージには赤いダンサーが立つ)。何が起きたかは、欄の下の文が言う。
 *
 * ■ 当たったことを2つで示す
 * 枠の色と、外側の薄い輪(ring)。枠だけだと、暗いテーマで差が出ない。
 */
export function TextField({
  label,
  isLabelVisible = true,
  hasError = false,
  size = "md",
  ...props
}: Props) {
  return (
    <label className="flex flex-col gap-base">
      <span className={isLabelVisible ? "text-label text-fg-sub" : "sr-only"}>
        {label}
      </span>
      <input
        {...props}
        aria-label={isLabelVisible ? props["aria-label"] : label}
        aria-invalid={hasError || undefined}
        className={`w-full rounded-lg border bg-surface-raised px-gutter text-body text-fg-strong placeholder:text-fg-muted focus:ring-[3px] focus:ring-accent/16 focus:outline-none ${
          size === "lg" ? "h-target-lg" : "h-target"
        } ${hasError ? "border-accent" : "border-line focus:border-accent"}`}
      />
    </label>
  );
}
