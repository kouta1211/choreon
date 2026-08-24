"use client";

import { UserPlus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useLocale, useT } from "@/features/i18n/LocaleProvider";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import {
  DANCER_SORTS,
  sortDancerRows,
} from "@/features/dancer/lib/dancerOrder";

/**
 * いまのシーンにいるダンサーの一覧。画面が広いときだけ出す右パネルの中身。
 *
 * ステージ上のマーカーは名前が小さく、重なると読みづらい。一覧なら
 * 「誰がいるか」「いま何人か」がひと目で分かり、行をタップすれば
 * その人を選べる(ステージ上の小さな的を狙わなくてよい)。
 *
 * 座標を添えているのは、左右対称に置けているかの確認や、口頭で
 * 位置を伝えるときに数字があると早いため。
 */
export function DancerList() {
  const t = useT();
  const locale = useLocale();
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectedDancerIds = useUIStore((state) => state.selectedDancerIds);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const toggleDancer = useUIStore((state) => state.toggleDancer);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  const dancers = useProjectStore((state) => state.dancers);
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""],
  );

  /* 並べ替えは端末の好み（作品の中身ではない）。設定と同じ場所へ覚える */
  const dancerSort = useSettingsStore((state) => state.dancerSort);
  const updateSetting = useSettingsStore((state) => state.update);

  const rows = sortDancerRows(
    Object.values(positions ?? {})
      .map((position) => ({ position, dancer: dancers[position.dancerId] }))
      .filter((row) => row.dancer !== undefined),
    dancerSort,
    locale,
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline justify-between gap-unit px-gutter py-3">
        <span className="text-sm font-semibold text-fg-strong">
          {t.dancer.list.title}
        </span>
        <span className="shrink-0 font-mono text-caption text-fg-muted">
          {t.dancer.list.count(rows.length)}
        </span>
      </div>

      {/* 並べ替え。**2人以下では出さない** — 並べ替える意味が無いのに
          場所だけ取る（一覧の高さはステージの取り分と競っている） */}
      {rows.length > 2 && (
        <div className="shrink-0 px-gutter pb-unit">
          <SegmentedControl
            label={t.dancer.list.sortLabel}
            value={dancerSort}
            options={DANCER_SORTS.map((value) => ({
              value,
              label: t.dancer.list.sorts[value],
            }))}
            onChange={(next) => updateSetting("dancerSort", next)}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-gutter pb-3">
        {rows.length === 0 ? (
          <p className="px-0.5 text-caption leading-relaxed text-fg-muted">
            {t.dancer.list.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-base">
            {rows.map(({ dancer, position }) => {
              const isSelected = selectedDancerIds.includes(dancer.id);
              return (
                <li key={dancer.id}>
                  <PressableButton
                    /* ステージの丸と同じ規則。同じ意味の操作を、
                       場所によって変えない */
                    onClick={(event) => {
                      if (event.shiftKey || event.metaKey || event.ctrlKey) {
                        toggleDancer(dancer.id);
                      } else {
                        selectDancer(isSelected ? null : dancer.id);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-unit rounded-lg px-unit py-unit text-left ${
                      isSelected
                        ? "bg-surface-strong"
                        : "hover:bg-surface-strong/60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="block h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: themedDancerColor(dancer.color),
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-label text-fg-strong">
                      {dancer.name}
                    </span>
                    <span className="shrink-0 font-mono text-caption text-fg-muted">
                      {position.xCoordinate.toFixed(1)},
                      {position.yCoordinate.toFixed(1)}
                    </span>
                  </PressableButton>
                </li>
              );
            })}
          </ul>
        )}

        <PressableButton
          onClick={() => setAddDancerSheetOpen(true)}
          className="mt-unit flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-label font-medium whitespace-nowrap text-fg-sub"
        >
          <UserPlus size={14} className="shrink-0" />
          {t.editor.addDancer}
        </PressableButton>
      </div>
    </div>
  );
}
