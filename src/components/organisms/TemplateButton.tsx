"use client";

import { LayoutGrid } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Tooltip } from "@/components/atoms/Tooltip";
import { useTemplateSuggestion } from "@/features/canvas/hooks/useTemplateSuggestion";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const setTemplateSheetOpen = useUIStore(
    (state) => state.setTemplateSheetOpen,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const dancerCount = useProjectStore(
    (state) =>
      Object.keys(state.positionsBySceneId[selectedSceneId ?? ""] ?? {}).length,
  );
  const isAvailable = dancerCount >= 2;
  // 「前のシーンと同じ配置のまま」のときだけ、押す価値があることを点で示す。
  // 以前は同じことを横幅いっぱいのバナーでやっていた(useTemplateSuggestion参照)
  const isSuggested = useTemplateSuggestion();

  return (
    <Tooltip label={t.editor.template.open} placement="top" align="left">
      <PressableButton
        onClick={() => setTemplateSheetOpen(true)}
        disabled={!isAvailable}
        aria-label={
          isSuggested
            ? t.editor.template.openSame
            : t.editor.template.open
        }
        className="relative flex h-11 w-11 items-center justify-center rounded-[calc(var(--radius)*1.0833)] border border-line-strong bg-surface/90 text-fg disabled:pointer-events-none disabled:opacity-30"
      >
        <LayoutGrid size={18} />
        {/* 人数の数字は右上に出さない(実機の報告 17-4)。人数は
            ステージを見れば分かるうえ、シートを開けば見出しに出る。
            ここに置く価値があるのは「押す価値があるか」の点(下)だけ */}
        {isSuggested && (
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent"
          />
        )}
      </PressableButton>
    </Tooltip>
  );
}
