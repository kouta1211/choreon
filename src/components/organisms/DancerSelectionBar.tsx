"use client";

import { PressableButton } from "@/components/atoms/PressableButton";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 2人以上を選んでいるときに、ドックの上へ出る細い帯。
 *
 * ■ なぜ要るのか(2026-08-18、複数選択を足したぶん)
 * 1人だけのときは板(DancerInspector)が出るので「選んでいる」ことが見える。
 * 複数のときはその板を出さない（向きも曲線も1人ぶんの操作なので）ため、
 * **何も出ないと、選べているのかどうかが丸のリングだけの判断になる**。
 * 何人選んでいて、いま何ができるのかをここで言う。
 *
 * 解除を置いてあるのは、ステージの外を押す/Esc を知らない人でも
 * 戻れるようにするため。
 */
export function DancerSelectionBar() {
  const t = useT();
  const count = useUIStore((state) => state.selectedDancerIds.length);
  const selectDancer = useUIStore((state) => state.selectDancer);

  // 1人のときは板の方が出る。0人のときは何も無い
  if (count < 2) return null;

  return (
    <div className="overlay-panel absolute inset-x-0 bottom-full z-20 mx-3 mb-2 flex items-center gap-gutter rounded-xl px-gutter py-unit">
      <span className="shrink-0 text-label font-semibold text-fg-strong">
        {t.dancer.selection.count(count)}
      </span>
      <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">
        {t.dancer.selection.hint}
      </span>
      <PressableButton
        onClick={() => selectDancer(null)}
        className="h-target shrink-0 rounded-lg px-gutter text-label text-fg-sub"
      >
        {t.dancer.selection.clear}
      </PressableButton>
    </div>
  );
}
