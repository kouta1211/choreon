"use client";

import { UserPlus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";

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
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  const dancers = useProjectStore((state) => state.dancers);
  const positions = useProjectStore(
    (state) => state.positionsBySceneId[selectedSceneId ?? ""],
  );

  const rows = Object.values(positions ?? {})
    .map((position) => ({ position, dancer: dancers[position.dancerId] }))
    .filter((row) => row.dancer !== undefined)
    .sort((a, b) => a.dancer.createdAt.localeCompare(b.dancer.createdAt));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline justify-between gap-2 px-3.5 py-3">
        <span className="text-sm font-semibold text-fg-strong">ダンサー</span>
        <span className="shrink-0 font-mono text-caption text-fg-muted">
          {rows.length}人
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {rows.length === 0 ? (
          <p className="px-0.5 text-caption leading-relaxed text-fg-muted">
            このシーンにはまだ誰もいません。
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map(({ dancer, position }) => {
              const isSelected = dancer.id === selectedDancerId;
              return (
                <li key={dancer.id}>
                  <PressableButton
                    onClick={() => selectDancer(isSelected ? null : dancer.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left ${
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
                    <span className="shrink-0 font-mono text-[10px] text-fg-muted">
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
          className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-label font-medium whitespace-nowrap text-fg-sub"
        >
          <UserPlus size={14} className="shrink-0" />
          ダンサーを追加
        </PressableButton>
      </div>
    </div>
  );
}
