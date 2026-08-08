"use client";

import { useState } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCw } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useApplyTemplate } from "@/features/canvas/hooks/useApplyTemplate";
import {
  DEFAULT_TRANSFORM,
  nearestAvailableCount,
  resolveFormationPoints,
  templatesForCount,
  type FormationSpacing,
  type FormationTemplate,
  type FormationTransform,
} from "@/features/canvas/lib/formationTemplates";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

const SPACING_LABELS: { value: FormationSpacing; label: string }[] = [
  { value: "narrow", label: "狭い" },
  { value: "normal", label: "標準" },
  { value: "wide", label: "広い" },
];

/**
 * 既成のフォーメーションから選んで、いまのシーンに当てはめるシート。
 *
 * 人数タブは作らない。いまステージにいる人数のテンプレートだけを出す。
 * 「4人の形を見たいのは、4人いるとき」であって、人数を選ばせるのは
 * 手間が増えるだけだから。
 *
 * 変形(左右反転・前後反転・90°回転・間隔)は、カードのサムネイルにも
 * 反映する。選ぶ前に結果が見えないと、当ててから戻すことになる。
 */
export function TemplateSheet({ project }: Props) {
  const [transform, setTransform] =
    useState<FormationTransform>(DEFAULT_TRANSFORM);
  const isOpen = useUIStore((state) => state.isTemplateSheetOpen);
  const setTemplateSheetOpen = useUIStore(
    (state) => state.setTemplateSheetOpen,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const dancers = useProjectStore((state) => state.dancers);
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""],
  );
  const { applyTemplate, isApplying } = useApplyTemplate(project);

  const onStage = Object.values(positions ?? {});
  const dancerCount = onStage.length;
  const templates = templatesForCount(dancerCount);
  const fallbackCount =
    templates.length === 0 ? nearestAvailableCount(dancerCount) : null;
  const shownTemplates =
    templates.length > 0
      ? templates
      : fallbackCount
        ? templatesForCount(fallbackCount)
        : [];

  const close = () => setTemplateSheetOpen(false);

  const handleApply = async (formation: FormationTemplate) => {
    await applyTemplate(formation, transform);
    close();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={close}
      title={
        dancerCount >= 2
          ? `${dancerCount}人のフォーメーション`
          : "フォーメーション"
      }
      titleRight={shownTemplates.length > 0 ? `${shownTemplates.length}種` : undefined}
      isTall
    >
      <div className="flex flex-col gap-3.5 px-3.5 py-3">
        {dancerCount < 2 ? (
          <p className="rounded-xl border border-zinc-800 bg-[#1f1f23] p-4 text-xs leading-relaxed text-zinc-400">
            フォーメーションを選ぶには
            <span className="text-zinc-50">2人以上</span>
            が必要です。ヘッダーの人物アイコンからダンサーを追加してください。
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {onStage.map((position) => (
                <span
                  key={position.dancerId}
                  aria-hidden
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: dancers[position.dancerId]?.color,
                  }}
                />
              ))}
              <span className="ml-1 text-[11px] text-zinc-500">
                {fallbackCount
                  ? `${dancerCount}人ぶんの形はまだありません。近い${fallbackCount}人の形を土台にできます（余る人はいまの位置のまま）`
                  : `いまステージにいる${dancerCount}人に合わせて表示しています`}
              </span>
            </div>

            <TransformControls
              transform={transform}
              onChange={setTransform}
            />

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {shownTemplates.map((formation) => (
                <button
                  key={`${formation.count}-${formation.name}`}
                  type="button"
                  onClick={() => handleApply(formation)}
                  disabled={isApplying}
                  className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-[#1f1f23] p-2 text-left disabled:opacity-50"
                >
                  <TemplatePreview
                    formation={formation}
                    transform={transform}
                    project={project}
                    dancerColors={onStage.map(
                      (position) => dancers[position.dancerId]?.color ?? "#ec4899",
                    )}
                  />
                  <span className="truncate text-[11px] font-medium text-zinc-300">
                    {formation.name}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** 変形のチップ。押した結果はすぐ下のサムネイルに反映される */
function TransformControls({
  transform,
  onChange,
}: {
  transform: FormationTransform;
  onChange: (next: FormationTransform) => void;
}) {
  const toggles = [
    {
      key: "flipX" as const,
      label: "左右反転",
      icon: FlipHorizontal2,
    },
    {
      key: "flipY" as const,
      label: "前後反転",
      icon: FlipVertical2,
    },
    { key: "rotate" as const, label: "90°回転", icon: RotateCw },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {toggles.map((item) => (
        <button
          key={item.key}
          type="button"
          role="switch"
          aria-checked={transform[item.key]}
          onClick={() => onChange({ ...transform, [item.key]: !transform[item.key] })}
          className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium whitespace-nowrap ${
            transform[item.key]
              ? "border-pink-500 bg-pink-500/12 text-pink-400"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          <item.icon size={13} />
          {item.label}
        </button>
      ))}

      <div className="flex overflow-hidden rounded-full border border-zinc-700">
        {SPACING_LABELS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={transform.spacing === option.value}
            onClick={() => onChange({ ...transform, spacing: option.value })}
            className={`h-8 px-3 text-[11px] font-medium whitespace-nowrap ${
              transform.spacing === option.value
                ? "bg-pink-500/12 text-pink-400"
                : "text-zinc-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** テンプレートのミニチュア。変形を反映して「選ぶ前に結果が見える」ようにする */
function TemplatePreview({
  formation,
  transform,
  project,
  dancerColors,
}: {
  formation: FormationTemplate;
  transform: FormationTransform;
  project: Project;
  dancerColors: string[];
}) {
  const points = resolveFormationPoints(
    formation.points,
    transform,
    project.stageWidth,
    project.stageHeight,
  );

  return (
    <span
      aria-hidden
      className="relative block w-full overflow-hidden rounded-md border border-zinc-700 bg-[#0f0f11]"
      style={{ aspectRatio: `${project.stageWidth} / ${project.stageHeight}` }}
    >
      <span
        className="absolute inset-0 block bg-[linear-gradient(to_right,#232329_1px,transparent_1px),linear-gradient(to_bottom,#232329_1px,transparent_1px)]"
        style={{
          backgroundSize: `${100 / project.stageWidth}% ${100 / project.stageHeight}%`,
        }}
      />
      {points.map((point, index) => (
        <span
          key={index}
          className="absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(point.x / project.stageWidth) * 100}%`,
            top: `${(point.y / project.stageHeight) * 100}%`,
            backgroundColor: dancerColors[index] ?? "#71717a",
          }}
        />
      ))}
    </span>
  );
}
