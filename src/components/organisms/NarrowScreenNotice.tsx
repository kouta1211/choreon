"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Monitor, X } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  buildShareLink,
  parseShareLink,
} from "@/features/project/lib/shareLink";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
};

/**
 * **狭い幅**で作成画面を開いた人に、この幅では組めないと伝える板。
 *
 * ■ なぜ出すのか(2026-08-18 の方針転換)
 * 作るのは PC / タブレット、見るのはスマホ、と UX を割った。実機で触ると、
 * 払う操作がブラウザの「戻る」ジェスチャと取り合いになり、指より小さい丸を
 * 狭い画面で置き直すことになる。**そこを磨いてもスマホ完結のアプリの土俵で
 * 二番手になるだけ**なので、直すのではなく行き先を分ける方を選んだ。
 * 経緯は README のフェーズ6にある。
 *
 * ■ 逃げ道は無い(2026-08-20 に user の判断で閉じた)
 * 以前は「このまま開く(非推奨)」を残していたが、**入れても操作できない**
 * 画面へ通していただけだった。いまは抜けられない。
 *
 * ■ 言うのは【端末】ではなく【幅】
 * 出し分けは幅(`min-[768px]:hidden`)なので、PC でウィンドウを狭めても出る。
 * 「スマホでは使えません」と書くと、PC の人には嘘になる。**この幅では
 * 組めない・広げれば戻る**、と幅の話として書く(user の言葉、2026-08-20)。
 *
 * ■ 出し分けは CSS でやる(`min-[768px]:hidden`)
 * JavaScript(`useScreenKind`)で分けると、**サーバー側には画面幅が無いので
 * 一度スマホとして描かれる**（`useIsWideScreen.ts` の getServerSnapshot）。
 * PC で開いた人にも一瞬この板が出てから本体へ入れ替わることになる。
 * 幅で決まるものは幅で出し分ける。
 *
 * ■ 見る側への出口は、開けるときだけ
 * 共有していない作品でビューアへのリンクを出すと、押しても開けない。
 * 合鍵(shareToken)があるときだけ出す。
 */
export function NarrowScreenNotice({ project }: Props) {
  const t = useT();
  const router = useRouter();
  const [pasted, setPasted] = useState("");
  const [hasError, setHasError] = useState(false);

  const handleOpen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const link = parseShareLink(pasted);
    if (!link) {
      setHasError(true);
      return;
    }

    /* 貼られたのが他所のURLでも、開くのは【このアプリの中】。
       合鍵とポジションだけを持っていく */
    const query = new URLSearchParams();
    if (link.shareToken) query.set("t", link.shareToken);
    if (link.dancerId) query.set("p", link.dancerId);
    const search = query.toString();

    router.push(`/view/${link.projectId}${search === "" ? "" : `?${search}`}`);
  };
  /* 共有していれば、そのまま見る側で開ける。origin は描くのがブラウザの中
     だけなので、ここで読んでよい(この板はクライアント専用) */
  const viewerHref =
    project.isShared && project.shareToken
      ? buildShareLink({
          origin: window.location.origin,
          projectId: project.id,
          shareToken: project.shareToken,
        })
      : null;

  return (
    /* 幕ではなく**差し替え**なので、地は透かさない(bg-page)。
       重なりは カウントイン(80)・起動画面(100) より下、
       シート(40)・トースト(50) より上 */
    <div
      role="dialog"
      /* aria-modal は付けない。後ろの作成画面は**描かれたまま**で、
         幅を戻せばそのまま使える（消しているわけではない）。
         付けると読み上げに「後ろは無いもの」と伝わってしまう */
      aria-label={t.editor.narrowScreen.title}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-gutter-lg bg-page px-gutter-lg text-center min-[768px]:hidden"
    >
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-fg-sub"
      >
        <Monitor size={26} />
      </span>

      <div className="flex max-w-xs flex-col gap-unit">
        <h1 className="text-title text-fg-strong">
          {t.editor.narrowScreen.title}
        </h1>
        {/* 改行の位置は文が持っている(user が決めた3行)。折り返しを
            ブラウザ任せにせず、そのまま出す。**自動の文節折り(Phrase)は
            通さない** — 決めた改行と二重に効くと、行の切れ方が読めなくなる */}
        <p className="text-label leading-relaxed whitespace-pre-line text-fg-sub">
          {t.editor.narrowScreen.body}
        </p>
      </div>

      {/* 押せるものだけを、1つの塊にまとめる */}
      <div className="flex w-full max-w-xs flex-col gap-gutter">
        {viewerHref && (
          <a
            href={viewerHref}
            className="flex h-target-lg w-full items-center justify-center rounded-lg bg-accent text-headline text-accent-fg"
          >
            {t.editor.narrowScreen.openViewer}
          </a>
        )}

        {/* 配られたリンクを貼って、見る側へ行く道(2026-08-20)。
            この板は行き止まりなので、**ここから開ける先**を1つ置く。
            いま開いている作品と関係なくてよい — 狭い幅で来た人が
            やりたいのは「自分に配られた振付を見ること」だから */}
        <form onSubmit={handleOpen} className="flex flex-col gap-unit">
          <label className="flex flex-col gap-base text-left">
            <span className="text-label text-fg-sub">
              {t.editor.narrowScreen.pasteLabel}
            </span>
            <input
              value={pasted}
              onChange={(event) => {
                setPasted(event.target.value);
                setHasError(false);
              }}
              type="text"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t.editor.narrowScreen.pastePlaceholder}
              aria-label={t.editor.narrowScreen.pasteLabel}
              aria-invalid={hasError}
              className={`h-target w-full rounded-lg border bg-surface-raised px-gutter text-body text-fg-strong placeholder:text-fg-muted focus:ring-[3px] focus:ring-accent/16 focus:outline-none ${
                hasError ? "border-accent" : "border-line focus:border-accent"
              }`}
            />
          </label>

          {/* 失敗は【形】で伝える。この画面だけ赤い文にしない */}
          {hasError && (
            <p
              role="alert"
              className="flex items-start gap-unit text-left text-label text-fg"
            >
              <span
                aria-hidden
                className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-strong text-fg-strong"
              >
                <X size={10} strokeWidth={3} />
              </span>
              {t.editor.narrowScreen.pasteInvalid}
            </p>
          )}

          <PressableButton
            type="submit"
            disabled={pasted.trim() === ""}
            className="flex h-target w-full items-center justify-center rounded-lg border border-line bg-surface-raised text-body text-fg-strong disabled:opacity-40"
          >
            {t.editor.narrowScreen.pasteOpen}
          </PressableButton>
        </form>
      </div>
    </div>
  );
}
