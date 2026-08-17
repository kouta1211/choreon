"use client";

import { useState } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCw } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { FormationPreview } from "@/components/molecules/FormationPreview";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useApplyTemplate } from "@/features/canvas/hooks/useApplyTemplate";
import {
  availableCounts,
  DEFAULT_TRANSFORM,
  templatesForCount,
  type FormationSpacing,
  type FormationTransform,
} from "@/features/canvas/lib/formationTemplates";
import type { Project } from "@/features/project/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";
import { formationName } from "@/features/i18n/lib/formationName";
import { formationKey } from "@/features/canvas/lib/formationTemplates";

type Props = {
  project: Project;
};

const SPACING_VALUES: FormationSpacing[] = ["narrow", "normal", "wide"];

/**
 * 既成のフォーメーションから選んで、いまのシーンに当てはめるシート。
 *
 * 開いた直後はステージにいる人数の形が出る。ただし人数レールで他の人数へ
 * 切り替えられる。「6人だけど、5人の形の方が近い」という選び方が実際に
 * あるためで、そのときに何が起きるか(誰が余る/どこが空く)は帯で明示する。
 *
 * 選んですぐ適用せず、いったん選択状態にして下のボタンで確定させる。
 * 変形(左右反転・前後反転・90°回転・間隔)を掛けた結果をサムネイルで
 * 確かめてから決められるようにするため。
 */
export function TemplateSheet({ project }: Props) {
  const t = useT();
  const [transform, setTransform] =
    useState<FormationTransform>(DEFAULT_TRANSFORM);
  /** null = いまステージにいる人数に従う(開き直すたびに追従させたいので、
   * 具体的な数字ではなく「未選択」を持つ) */
  const [pickedCount, setPickedCount] = useState<number | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
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
  const counts = availableCounts();
  const shownCount = pickedCount ?? dancerCount;
  const templates = templatesForCount(shownCount);
  const picked = pickedIndex === null ? null : (templates[pickedIndex] ?? null);
  const dancerColors = onStage.map((position) =>
    themedDancerColor(dancers[position.dancerId]?.color ?? ""),
  );

  // 開き直したときに前回の選択が残っていると、意図しない形を当ててしまう
  const close = () => {
    setTemplateSheetOpen(false);
    setPickedCount(null);
    setPickedIndex(null);
  };

  const handleApply = async () => {
    if (!picked) return;
    await applyTemplate(picked, transform);
    close();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={close}
      title={t.templateSheet.title}
      titleRight={
        templates.length > 0
          ? t.templateSheet.shapeCount(templates.length)
          : undefined
      }
      isTall
      wideMaxWidthClassName="min-[1200px]:max-w-4xl"
    >
      {dancerCount < 2 ? (
        <p className="m-3.5 rounded-xl border border-line bg-surface-raised p-4 text-xs leading-relaxed text-fg-sub">
          {t.templateSheet.needsTwoNotice}
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-3.5 py-3">
          <CountRail
            counts={counts}
            shownCount={shownCount}
            dancerCount={dancerCount}
            onChange={(count) => {
              setPickedCount(count);
              setPickedIndex(null);
            }}
          />

          <CountMismatchNote
            shownCount={shownCount}
            dancerCount={dancerCount}
            dancerColors={dancerColors}
          />

          <TransformControls transform={transform} onChange={setTransform} />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {templates.map((formation, index) => {
              const isPicked = pickedIndex === index;
              return (
                <PressableButton
                  key={`${formation.count}-${formationKey(formation.label)}-${index}`}
                  type="button"
                  aria-pressed={isPicked}
                  onClick={() => setPickedIndex(index)}
                  className={`flex flex-col gap-1.5 rounded-xl border p-2 text-left ${
                    isPicked
                      ? "border-accent bg-accent-row"
                      : "border-line bg-surface-raised"
                  } ${shownCount === dancerCount ? "" : "opacity-75"}`}
                >
                  <FormationPreview
                    formation={formation}
                    transform={transform}
                    stageWidth={project.stageWidth}
                    stageHeight={project.stageHeight}
                    dancerCount={dancerCount}
                    dancerColors={dancerColors}
                  />
                  <span
                    className={`truncate text-caption font-medium ${
                      isPicked ? "text-accent-soft" : "text-fg"
                    }`}
                  >
                    {formationName(formation.label, t)}
                  </span>
                </PressableButton>
              );
            })}
          </div>

          {/* 確定ボタン。スクロールしても見失わないよう下端に貼り付ける */}
          <div className="sticky bottom-0 -mx-3.5 -mb-3 bg-surface/95 px-3.5 pt-2 pb-3 backdrop-blur">
            <PressableButton
              onClick={handleApply}
              disabled={!picked || isApplying}
              className="h-12 w-full rounded-[calc(var(--radius)*0.9167)] bg-accent text-sm font-semibold text-accent-fg disabled:bg-surface-strong disabled:text-fg-muted"
            >
              {picked
                ? t.templateSheet.applyNamed(formationName(picked.label, t))
                : t.templateSheet.apply}
            </PressableButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

/** 人数の切り替えレール。いまステージにいる人数には「いま」を出す */
function CountRail({
  counts,
  shownCount,
  dancerCount,
  onChange,
}: {
  counts: number[];
  shownCount: number;
  dancerCount: number;
  onChange: (count: number) => void;
}) {
  const t = useT();
  return (
    <div className="scrollbar-hide -mx-3.5 flex gap-1.5 overflow-x-auto px-3.5">
      {counts.map((count) => {
        const isShown = count === shownCount;
        return (
          <PressableButton
            key={count}
            type="button"
            aria-pressed={isShown}
            onClick={() => onChange(count)}
            className={`relative flex h-9 shrink-0 items-center rounded-[calc(var(--radius)*0.8333)] border px-3 text-xs font-medium ${
              isShown
                ? "border-accent bg-accent/12 text-accent-soft"
                : "border-line-strong text-fg-sub"
            }`}
          >
            <span className="font-mono">{t.templateSheet.castCount(count)}</span>
            {count === dancerCount && (
              <span className="ml-1.5 rounded-[calc(var(--radius)*0.4167)] bg-accent px-1 py-px text-caption font-semibold text-accent-fg">
                {t.templateSheet.current}
              </span>
            )}
          </PressableButton>
        );
      })}
    </div>
  );
}

/**
 * 人数が食い違うときに、何が起きるかを先に伝える帯。
 *
 * 「当ててみたら3人が置き去りになっていた」を防ぐのが目的なので、
 * 数を入れて具体的に書く。人数が一致しているときは何も出さない
 * (毎回出すと、正常な状態でも警告が出ているように見える)。
 */
function CountMismatchNote({
  shownCount,
  dancerCount,
  dancerColors,
}: {
  shownCount: number;
  dancerCount: number;
  dancerColors: string[];
}) {
  const t = useT();
  if (shownCount === dancerCount) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {dancerColors.map((color, index) => (
          <span
            key={index}
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="ml-1 text-caption text-fg-muted">
          {t.templateSheet.matchingCast(dancerCount)}
        </span>
      </div>
    );
  }

  const gap = Math.abs(shownCount - dancerCount);
  return (
    <p className="rounded-[calc(var(--radius)*0.8333)] border border-accent/40 bg-accent/10 px-3 py-2 text-caption leading-relaxed text-accent-bright">
      {t.templateSheet.forCast(shownCount)}{" "}
      {shownCount < dancerCount
        ? t.templateSheet.leftOver(gap)
        : t.templateSheet.emptySpots(gap)}
    </p>
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
  const t = useT();
  const toggles = [
    {
      key: "flipX" as const,
      label: t.templateSheet.flipX,
      icon: FlipHorizontal2,
    },
    {
      key: "flipY" as const,
      label: t.templateSheet.flipY,
      icon: FlipVertical2,
    },
    { key: "rotate" as const, label: t.templateSheet.rotate, icon: RotateCw },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {toggles.map((item) => (
        <PressableButton
          key={item.key}
          type="button"
          role="switch"
          aria-checked={transform[item.key]}
          onClick={() =>
            onChange({ ...transform, [item.key]: !transform[item.key] })
          }
          className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium whitespace-nowrap ${
            transform[item.key]
              ? "border-accent bg-accent/12 text-accent-soft"
              : "border-line-strong text-fg-sub"
          }`}
        >
          <item.icon size={13} />
          {item.label}
        </PressableButton>
      ))}

      <div className="flex overflow-hidden rounded-full border border-line-strong">
        {SPACING_VALUES.map((option) => (
          <PressableButton
            key={option}
            type="button"
            aria-pressed={transform.spacing === option}
            onClick={() => onChange({ ...transform, spacing: option })}
            className={`h-8 px-3 text-caption font-medium whitespace-nowrap ${
              transform.spacing === option
                ? "bg-accent/12 text-accent-soft"
                : "text-fg-sub"
            }`}
          >
            {t.templateSheet.spacing[option]}
          </PressableButton>
        ))}
      </div>
    </div>
  );
}
