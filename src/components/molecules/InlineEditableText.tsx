"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

type Props = {
  /** 現在の確定値 */
  value: string;
  /** Enterまたはフォーカスが外れて確定したときに呼ばれる。値が実際に
   * 変わったときだけ呼ばれるので、呼び出し側は毎回保存してよい */
  onCommit: (value: string) => void;
  /** スクリーンリーダー向けの名前(「プロジェクト名」など)。
   * 表示ボタンには「〜を変更」として付く */
  label: string;
  /** 名前の前に置く小さなバッジ(シーンの `S3` など) */
  prefix?: ReactNode;
  /** 表示テキストの見た目。サイズと太さは置き場所によって変わるので
   * 呼び出し側で決める */
  textClassName?: string;
  /** 枠を横幅いっぱいに広げるか(プロジェクト名のように長い場合) */
  fullWidth?: boolean;
};

/**
 * タップするとその場で編集できるテキスト。プロジェクト名・シーン名・
 * ダンサー名の3箇所で同じ作法にするための共通部品。
 *
 * 「押せること」は破線の枠と鉛筆アイコンで示す。以前は点線の下線だけで、
 * 編集できると分からないという指摘があったため。
 *
 * 編集中かどうかを真偽値ではなく「下書きの文字列 or null」で持っている。
 * 真偽値と入力値を別々に持つと、確定・取消のたびに両方を戻す必要があり、
 * 片方だけ戻し忘れると前回の入力が残る。nullを「編集していない」と
 * するとその取りこぼしが起きない。
 *
 * 空欄のまま確定した場合と、値が変わっていない場合は何もしない
 * (名前を空にできてしまうと、どのシーン・誰なのか分からなくなるため)。
 */
export function InlineEditableText({
  value,
  onCommit,
  label,
  prefix,
  textClassName = "",
  fullWidth = false,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    setDraft(null);
    if (!trimmed || trimmed === value) return;
    onCommit(trimmed);
  };

  if (draft !== null) {
    return (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setDraft(null);
        }}
        className={`h-[34px] min-w-0 rounded-[9px] border border-pink-500 bg-zinc-800 px-2.5 text-zinc-50 ring-[3px] ring-pink-500/15 outline-none ${
          fullWidth ? "w-full" : "w-40"
        } ${textClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(value)}
      aria-label={`${label}を変更`}
      // 枠自体が44pxのタップ的になるよう、外側に縦の余白を足している
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-2 py-1 text-left ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {prefix}
      <span className={`min-w-0 truncate text-zinc-50 ${textClassName}`}>
        {value}
      </span>
      <Pencil size={12} className="shrink-0 text-zinc-500" aria-hidden />
    </button>
  );
}
