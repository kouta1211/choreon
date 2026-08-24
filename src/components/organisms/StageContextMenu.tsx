"use client";

import { type ReactNode } from "react";
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FacingGrid } from "@/components/molecules/FacingGrid";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useStageMenuActions } from "@/features/canvas/hooks/useStageMenuActions";
import { useStageMenuOpen } from "@/features/canvas/hooks/useStageMenuOpen";
import { type AlignAxis } from "@/features/canvas/lib/alignment";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  children: ReactNode;
};

/**
 * 整列の並び。**揃える2つ → 配る2つ**の順で、どちらも「横（左右）が先」。
 * 隊形は横一列から作ることが多いので、いちばん使うものを上に置く。
 */
const ALIGN_ACTIONS = [
  {
    labelKey: "row" as const,
    // 横一列＝前後(y)を揃える。画面の上下を鏡にしても、横一列は横一列
    axis: "y" as AlignAxis,
    mode: "align" as const,
    icon: AlignVerticalJustifyCenter,
  },
  {
    labelKey: "column" as const,
    axis: "x" as AlignAxis,
    mode: "align" as const,
    icon: AlignHorizontalJustifyCenter,
  },
  {
    labelKey: "spreadX" as const,
    axis: "x" as AlignAxis,
    mode: "distribute" as const,
    icon: AlignHorizontalDistributeCenter,
  },
  {
    labelKey: "spreadY" as const,
    axis: "y" as AlignAxis,
    mode: "distribute" as const,
    icon: AlignVerticalDistributeCenter,
  },
];

/**
 * ステージの右クリックのメニュー。**PC でしか出せない入口**として足した
 * (2026-08-19、作る側は PC / タブレットという方針の第3歩)。
 *
 * ■ なぜ要るのか
 * 向きを変えるつまみ(RotationHandle)は**1人選んでいるときしか出ない**。
 * 8人まとめて「奥を向く」に揃える道が無かった。ここの升なら、選んだ全員へ
 * 同じ向きを配れる。削除も、いままで1人ずつしか消せなかった。
 *
 * ■ メニューはステージ全体で1つ
 * ダンサー1人ずつに持たせると、20人居れば20個の入れ物ができる。
 * ここで1つだけ持ち、押された場所から DOM を遡って「誰の上か」を決める
 * (DraggableDancerIcon の data-dancer-id)。
 *
 * ■ ここが持っているのは板の並びだけ
 * 判断と実行は外に出してある。**ここへ条件を書き足さない。**
 * - **開くかどうか / どちらの束を出すか** → `useStageMenuOpen`
 * - **押されたときに何をするか** → `useStageMenuActions`
 * - **向きの3×3の升** → `molecules/FacingGrid`
 */
export function StageContextMenu({ children }: Props) {
  const t = useT();
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const { isOpen, target, hitTest, onOpenChange } = useStageMenuOpen();
  const {
    selectedCount,
    checkedScreenAngle,
    applyFacing,
    applyAlignment,
    deleteSelected,
    selectAllInScene,
    openAddDancer,
  } = useStageMenuActions();

  return (
    <ContextMenu open={isOpen} onOpenChange={onOpenChange}>
      <ContextMenuTrigger
        className="flex min-h-0 flex-1 flex-col"
        onPointerDown={(event) => hitTest(event.target)}
        onContextMenu={(event) => hitTest(event.target)}
      >
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent>
        {target === "dancer" && (
          <>
            <ContextMenuLabel>
              <span>{t.editor.contextMenu.facing.heading}</span>
              {/* 升の並びだけでは、左右がどちらから見た向きか分からない */}
              <span className="text-caption font-normal normal-case tracking-normal">
                {t.editor.contextMenu.facing.note}
              </span>
            </ContextMenuLabel>
            <FacingGrid
              value={checkedScreenAngle}
              isAudienceOnTop={isAudienceOnTop}
              onChange={(screenAngle) => void applyFacing(screenAngle)}
            />

            {/* 整列は2人以上いないと意味が無い。1人のときは束ごと出さない
                （押せない項目を並べるより、無い方が読む量が減る） */}
            {selectedCount > 1 && (
              <>
                <ContextMenuSeparator />
                <ContextMenuLabel>
                  <span>{t.editor.contextMenu.align.heading}</span>
                  {/* 誰かを基準にするのではないことを、押す前に伝える */}
                  <span className="text-caption font-normal normal-case tracking-normal">
                    {t.editor.contextMenu.align.note}
                  </span>
                </ContextMenuLabel>
                {/* 等間隔は両端の内側を配る操作なので、3人以上でないと何も
                    起きない。押して無反応になるより、項目ごと出さない。
                    Radix のメニューは並んだ項目を矢印キーで辿るので、
                    hidden で隠すだけでは空振りする行が残ってしまう */}
                {ALIGN_ACTIONS.filter(
                  (action) =>
                    action.mode !== "distribute" || selectedCount >= 3,
                ).map((action) => (
                  <ContextMenuItem
                    key={action.labelKey}
                    onSelect={() =>
                      void applyAlignment(action.axis, action.mode)
                    }
                  >
                    <action.icon size={16} aria-hidden className="shrink-0" />
                    <span>{t.editor.contextMenu.align[action.labelKey]}</span>
                  </ContextMenuItem>
                ))}
              </>
            )}

            <ContextMenuSeparator />

            {/* 赤は意味を運ぶ色(取り返しがつかない操作)なのでトークンの外。
                DancerInspector の削除ボタンと同じ組み合わせに揃えてある */}
            <ContextMenuItem
              onSelect={deleteSelected}
              className="data-[highlighted]:bg-red-950 data-[highlighted]:text-red-400"
            >
              <Trash2 size={16} aria-hidden className="shrink-0" />
              <span>
                {selectedCount > 1
                  ? t.editor.contextMenu.deleteMany(selectedCount)
                  : t.editor.contextMenu.deleteOne}
              </span>
            </ContextMenuItem>
          </>
        )}

        {target === "stage" && (
          <>
            <ContextMenuItem onSelect={selectAllInScene}>
              <Users size={16} aria-hidden className="shrink-0" />
              <span>{t.editor.contextMenu.selectAll}</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={openAddDancer}>
              <UserPlus size={16} aria-hidden className="shrink-0" />
              <span>{t.editor.contextMenu.addDancer}</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
