import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** trueの場合、ラベルは視覚的には隠すがスクリーンリーダーには読ませる(sr-only) */
  hideLabel?: boolean;
};

/**
 * labelとinputを1セットにまとめた共通部品。
 * idを渡さなかった場合はuseIdで自動生成する(同じフォームが複数箇所に
 * 描画されてもid重複が起きない。useStateで手動生成するより素直な方法)
 */
export function TextField({
  label,
  hideLabel = false,
  id,
  className = "",
  ...props
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={hideLabel ? "flex-1" : "space-y-1"}>
      <label
        htmlFor={inputId}
        className={
          hideLabel ? "sr-only" : "block text-sm text-zinc-400"
        }
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none disabled:opacity-50 ${className}`}
        {...props}
      />
    </div>
  );
}
