"use client";

import { Phrase } from "@/components/atoms/Phrase";
import { Monitor } from "lucide-react";
import { buildShareLink } from "@/features/project/lib/shareLink";
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
      /* aria-modal は付けない。**後ろを本当に不活性にしていない**（「このまま
         開く」で触れる作りなので、そうしていない）。付けると読み上げには
         「後ろは触れません」と嘘を言うことになる */
      aria-label={t.editor.narrowScreen.title}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-gutter bg-page px-gutter-lg text-center min-[768px]:hidden"
    >
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-fg-sub"
      >
        <Monitor size={26} />
      </span>

      <div className="flex flex-col gap-unit">
        <h1 className="text-title text-fg-strong">
          {t.editor.narrowScreen.title}
        </h1>
        <p className="max-w-xs text-label leading-relaxed text-fg-sub">
          <Phrase>{t.editor.narrowScreen.body}</Phrase>
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-unit">
        {viewerHref && (
          <a
            href={viewerHref}
            className="flex h-target-lg w-full items-center justify-center rounded-lg bg-accent text-headline text-accent-fg"
          >
            {t.editor.narrowScreen.openViewer}
          </a>
        )}
        <p className="text-caption leading-relaxed text-fg-muted">
          <Phrase>{t.editor.narrowScreen.viewerNote}</Phrase>
        </p>
      </div>
    </div>
  );
}
