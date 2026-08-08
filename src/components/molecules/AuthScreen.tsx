import type { ReactNode } from "react";

/** ブランドマークのドット。山型に並べて「隊形が組まれる瞬間」を表す */
const BRAND_DOTS = [
  { left: 0, top: 22, color: "#3b82f6" },
  { left: 22, top: 11, color: "#10b981" },
  { left: 44, top: 0, color: "#ec4899" },
  { left: 66, top: 11, color: "#f59e0b" },
  { left: 88, top: 22, color: "#8b5cf6" },
];

type Props = {
  children: ReactNode;
};

/**
 * ログイン・新規登録で共通の外枠。
 *
 * 汎用のカード1枚だけだと、このアプリが何をするものなのか初対面で
 * 伝わらない。背景に格子を寝かせて舞台の床に見せ、上からピンクの照明を
 * 当てることで、開いた瞬間に「舞台のアプリ」だと分かるようにしている。
 * ブランドマークもロゴタイプではなく、5人が山型に並んだ隊形そのもの。
 */
export function AuthScreen({ children }: Props) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
      {/* 舞台の床。perspectiveで奥へ倒して遠近を付ける */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-20%] bottom-[44%] bg-[linear-gradient(to_right,#26262b_1px,transparent_1px),linear-gradient(to_bottom,#26262b_1px,transparent_1px)] bg-[length:48px_48px] opacity-60 [transform:perspective(600px)_rotateX(52deg)]"
      />
      {/* 上手からの照明 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[110px] h-[130px] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(236,72,153,0.18),transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <span
            aria-hidden
            className="relative mb-4 block h-[31px] w-[97px]"
          >
            {BRAND_DOTS.map((dot) => (
              <span
                key={dot.left}
                className="absolute block h-[9px] w-[9px] rounded-full"
                style={{
                  left: dot.left,
                  top: dot.top,
                  backgroundColor: dot.color,
                }}
              />
            ))}
          </span>
          <h1 className="text-[34px] leading-none font-bold tracking-[-0.03em] text-zinc-50">
            Choreon
          </h1>
          <p className="mt-2.5 text-xs text-zinc-500">
            紙のフォーメーション図を、動く絵コンテに。
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/92 p-5 backdrop-blur-[8px]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** 認証フォームの入力欄。両画面で同じ見た目にするためここに置く */
export function AuthField({
  label,
  hasError = false,
  ...props
}: {
  label: string;
  hasError?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <input
        {...props}
        className={`h-[46px] rounded-[11px] border bg-zinc-800 px-3.5 text-sm text-zinc-50 focus:ring-[3px] focus:ring-pink-500/16 focus:outline-none ${
          hasError
            ? "border-red-600"
            : "border-zinc-700 focus:border-pink-500"
        }`}
      />
    </label>
  );
}

/** 送信ボタン。処理中はスピナーを添えて、押しても反応が無いように見せない */
export function AuthSubmitButton({
  isSubmitting,
  children,
  pendingLabel,
}: {
  isSubmitting: boolean;
  children: ReactNode;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-pink-500 text-sm font-semibold text-white disabled:opacity-55"
    >
      {isSubmitting && (
        <span
          aria-hidden
          className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {isSubmitting ? pendingLabel : children}
    </button>
  );
}
