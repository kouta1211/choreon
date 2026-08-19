"use client";

import { useState } from "react";
import { SceneList } from "@/components/organisms/SceneList";
import { DancerList } from "@/components/organisms/DancerList";
import { DancerInspector } from "@/components/organisms/DancerInspector";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSceneSummary } from "@/features/scene/hooks/useSceneSummary";
import type { Project } from "@/features/project/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  /** 3ペイン(1200px〜)ではシーンが左レールへ移るため、ここはダンサー専用になる */
  showScenes: boolean;
};

type Tab = "scenes" | "dancers";

/**
 * ステージの右に出すパネル。画面幅によって中身が変わる。
 *
 * - 2ペイン(768〜1199px): 横幅がパネル1枚ぶんしか無いので、
 *   「シーン」「ダンサー」をタブで切り替える
 * - 3ペイン(1200px〜): シーンは左レールへ移るので、ここはダンサーだけ。
 *   タブは選択肢が1つになるため出さない
 *
 * スマホでは出さない(シーンはドックのシート、ダンサーはステージ上で選ぶ)。
 */
export function EditorSidePanel({ project, showScenes }: Props) {
  const t = useT();
  const sceneSummary = useSceneSummary();
  const [tab, setTab] = useState<Tab>("scenes");
  const scenes = useProjectStore((state) => state.scenes);
  const activeTab: Tab = showScenes ? tab : "dancers";

  return (
    <aside className="flex w-[288px] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface/60 xl:w-[300px]">
      {showScenes ? (
        <div className="flex shrink-0 gap-1 border-b border-line p-2">
          {[
            {
              value: "scenes" as const,
              label: t.editor.scenes.title,
              count: scenes.length,
            },
            { value: "dancers" as const, label: t.editor.scenes.dancers },
          ].map((item) => (
            <PressableButton
              key={item.value}
              type="button"
              aria-pressed={activeTab === item.value}
              onClick={() => setTab(item.value)}
              className={`h-[34px] flex-1 rounded-[calc(var(--radius)*0.75)] text-xs font-medium ${
                activeTab === item.value
                  ? "bg-accent text-accent-fg"
                  : "text-fg-sub"
              }`}
            >
              {item.label}
            </PressableButton>
          ))}
        </div>
      ) : null}

      {activeTab === "scenes" ? (
        <>
          <div className="flex shrink-0 items-baseline justify-between gap-2 px-3.5 py-3">
            <span className="text-sm font-semibold text-fg-strong">
              {t.editor.scenes.title}
            </span>
            <span className="shrink-0 font-mono text-caption text-fg-muted">
              {sceneSummary}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <SceneList project={project} thumbnailSizePx={64} />
          </div>
        </>
      ) : (
        <DancerList />
      )}

      {/* 選んでいるダンサーの詳細。**タブの外**に据えるので、シーンの一覧を
          見ている間に選んでも出る。誰も選んでいなければ何も描かない */}
      <DancerInspector variant="panel" />
    </aside>
  );
}
