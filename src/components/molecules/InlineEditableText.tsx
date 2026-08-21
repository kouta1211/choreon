"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

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
  /**
   * 渡すと、表示中の文字がその行き先へのリンクになる(一覧の作品名など)。
   *
   * 「文字は押せない、入り口は鉛筆だけ」という約束はそのまま。押したときに
   * 起きるのが**編集ではなく移動**なので、読もうとして触った人が入力欄と
   * キーボードに出くわす、という元の事故は起きない。
   */
  href?: string;
};

/**
 * 鉛筆を押すとその場で編集できるテキスト。プロジェクト名・シーン名・
 * ダンサー名の3箇所で同じ作法にするための共通部品。
 *
 * 編集に入る入り口は【鉛筆ボタンだけ】で、テキスト自体は押せない。
 * 以前はテキストを含む全体が1つのボタンだったが、スマホでは名前を
 * 読もうとして触っただけで入力欄に変わり、キーボードがせり上がっていた。
 * 名前の周りは他の操作(カードを押してシーンを選ぶなど)と隣り合うことが
 * 多く、「読む場所」と「変える場所」は分けた方が事故が少ない。
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
  href,
}: Props) {
  const t = useT();
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
        /* **幅に上限を置く。** `w-full` だけだと親（ヘッダーの flex-1）に
           引き伸ばされて、名前の欄が画面幅いっぱいの枠になっていた
           — 元の題字は小さいのに、押した瞬間に1200pxの枠が出る
           （実機報告 02-12「変更中の枠の表示が変」）。
           名前を打つのに要る幅はこれで足りる */
        className={`h-[34px] min-w-0 rounded-lg border border-accent bg-surface-strong px-2.5 text-fg-strong ring-[3px] ring-accent/15 outline-none ${
          fullWidth ? "w-full max-w-[22rem]" : "w-40"
        } ${textClassName}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {prefix}
      {href ? (
        <Link
          href={href}
          className={`min-w-0 truncate text-fg-strong ${textClassName}`}
        >
          {value}
        </Link>
      ) : (
        /* ダブルクリックでも編集に入れる(2026-08-17)。
           **1回押しは今までどおり何も起きない** — スマホで名前を読もうと
           触っただけで入力欄に変わり、キーボードがせり上がる、という
           元の事故を戻さないため。指に「ダブルタップ」は無いので、
           これはマウスのある画面だけの近道になる。
           「鉛筆を触らないといけないのが不便」への答え */
        <span
          onDoubleClick={() => setDraft(value)}
          className={`min-w-0 truncate text-fg-strong ${textClassName}`}
        >
          {value}
        </span>
      )}
      <PressableButton
        kind="icon"
        onClick={() => setDraft(value)}
        aria-label={t.common.rename(label)}
        // 指で押せる大きさ(32px)を確保する。鉛筆の絵だけを置くと
        // 「飾りか操作か」が分かれないため、枠を持たせて押せると示す
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-fg-muted"
      >
        <Pencil size={13} aria-hidden />
      </PressableButton>
    </span>
  );
}
