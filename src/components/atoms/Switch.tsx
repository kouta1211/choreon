import type { LucideIcon } from "lucide-react";

type Props = {
  checked: boolean;
  onChange: () => void;
  label: string;
  /** ラベルの左に置くアイコン。メニューの行として使うとき、
   * ステージ上の見た目と結び付けるための手がかりになる */
  icon?: LucideIcon;
  /** 横幅いっぱいに広げ、ラベルを左・トグルを右に離す(メニューの行向け)。
   * 既定は内容ぶんの幅で、ラベルはトグルの右に並ぶ */
  fullWidth?: boolean;
  /** 補足説明。オンにすると何が起きるかを1行で添える */
  description?: string;
};

/** ラベル付きのトグルスイッチ。オンでpink背景、offでzincの枠線のみ
 * (Button/TextFieldと同じ配色ルールを踏襲している) */
export function Switch({
  checked,
  onChange,
  label,
  icon: Icon,
  fullWidth = false,
  description,
}: Props) {
  const toggle = (
    <span
      className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex cursor-pointer items-center gap-2.5 text-sm text-fg ${
        fullWidth ? "w-full justify-between rounded-lg px-2 py-2 text-left" : "w-fit"
      }`}
    >
      {fullWidth ? (
        <>
          <span className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <Icon
                size={16}
                aria-hidden
                className={`shrink-0 ${checked ? "text-accent-soft" : "text-fg-muted"}`}
              />
            )}
            <span className="min-w-0">
              <span className="block truncate">{label}</span>
              {description && (
                <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">
                  {description}
                </span>
              )}
            </span>
          </span>
          {toggle}
        </>
      ) : (
        <>
          {toggle}
          {label}
        </>
      )}
    </button>
  );
}
