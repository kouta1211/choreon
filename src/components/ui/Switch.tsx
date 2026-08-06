type Props = {
  checked: boolean;
  onChange: () => void;
  label: string;
};

/** ラベル付きのトグルスイッチ。オンでpink背景、offでzincの枠線のみ
 * (Button/TextFieldと同じ配色ルールを踏襲している) */
export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-pink-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {label}
    </label>
  );
}
