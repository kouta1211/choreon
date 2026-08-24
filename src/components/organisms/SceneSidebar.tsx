"use client";

import { SceneList } from "@/components/organisms/SceneList";
import { useSceneSummary } from "@/features/scene/hooks/useSceneSummary";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
};

/**
 * ステージの横に常時出すシーン一覧(画面が広いとき用)。
 *
 * 狭い画面ではシート越しに開くが、横に余裕があるならわざわざ隠す理由は
 * ない。並び替え・複製・削除に毎回シートを開閉しなくて済むぶん、
 * 動作確認や作り込みの往復が短くなる。
 *
 * 中身は SceneList で、ボトムシートと同じもの。
 */
export function SceneSidebar({ project }: Props) {
  const t = useT();
  const sceneSummary = useSceneSummary();

  return (
    /* 面は `.card-surface`(globals.css)。右のダンサーのパネル
       (EditorSidePanel) と同じ材質にする。**以前は `bg-surface/60` という
       半透明の生トークン**で、地の質感が透けて中の文字が沈んでいた
       （実機の報告 2026-08-22）。規約は frontend.md 2節の3項 */
    <aside className="card-surface flex w-[288px] shrink-0 flex-col overflow-hidden rounded-xl border border-line xl:w-[300px]">
      <div className="flex shrink-0 items-baseline justify-between gap-unit border-b border-line px-gutter py-3">
        <span className="text-label text-fg-strong">
          {t.editor.scenes.title}
        </span>
        <span className="shrink-0 font-mono text-caption text-fg-muted">
          {sceneSummary}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-3">
        <SceneList project={project} thumbnailSizePx={64} />
      </div>
    </aside>
  );
}
