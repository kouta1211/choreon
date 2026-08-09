"use client";

import { LayoutGrid } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Tooltip } from "@/components/atoms/Tooltip";

/**
 * フォーメーションのテンプレートを開く入口。ステージ【直下】の行の左端。
 *
 * ステージの中には重ねない。ステージは配置を読むための面で、そこに常設の
 * ボタンを置くと、その下にダンサーが来たときに隠れてしまう
 * (履歴ボタンは編集中に押す一時的なものなので例外扱いにしている)。
 *
 * 2人未満のときは押しても選べる形が無いが、隠さずに薄く出す。
 * 消えると「そんなボタンは無かった」と思われ、人が増えたあとも
 * 探してもらえなくなるため。
 */
export function TemplateButton() {
  const setTemplateSheetOpen = useUIStore(
    (state) => state.setTemplateSheetOpen,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const dancerCount = useProjectStore(
    (state) =>
      Object.keys(state.positionsBySceneId[selectedSceneId ?? ""] ?? {}).length,
  );
  const isAvailable = dancerCount >= 2;

  return (
    <Tooltip label="フォーメーションから選ぶ" placement="top" align="left">
      <button
        type="button"
        onClick={() => setTemplateSheetOpen(true)}
        disabled={!isAvailable}
        aria-label="フォーメーションから選ぶ"
        className="relative flex h-11 w-11 items-center justify-center rounded-[calc(var(--radius)*1.0833)] border border-line-strong bg-surface/90 text-fg disabled:pointer-events-none disabled:opacity-30"
      >
        <LayoutGrid size={18} />
        {isAvailable && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-strong px-1 font-mono text-[9px] font-semibold text-fg"
          >
            {dancerCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
