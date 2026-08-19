"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { usePositionCommit } from "@/features/scene/hooks/usePositionCommit";
import { useDeleteDancers } from "@/features/dancer/hooks/useDeleteDancers";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";
import {
  FACING_DIRECTIONS_IN_READING_ORDER,
  facingChanges,
  facingLabelKey,
  sharedFacing,
  toStageFacing,
} from "@/features/canvas/lib/facing";
import {
  alignmentChanges,
  type AlignAxis,
  type AlignMode,
} from "@/features/canvas/lib/alignment";
import {
  resolveContextMenuTarget,
  type ContextMenuTarget,
} from "@/features/canvas/lib/contextMenuTarget";
import { dancerIdsInScene } from "@/features/canvas/lib/selection";
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
 * ■ 開くかどうかは自分で決める(open を握っている)
 * ステージの下のボタン列(テンプレート・元に戻す)の上で右クリックしても、
 * ダンサーのメニューが出ては困る。当たり判定で誰にも当たらなければ開かない。
 *
 * ■ 指の長押しでも開く
 * Radix は触る端末では長押しで開く。長押しは pointerdown から測り始めるので、
 * 当たり判定も pointerdown で採っておく(右クリックは contextmenu より先に
 * pointerdown が来るので、どちらの道でも同じ値になる)。キーボードの
 * メニューキーには pointerdown が無いため、contextmenu でも採る。
 *
 * ■ 選択の扱い
 * 選んでいない人を右クリックしたら、**その人だけを選び直してから**開く。
 * 既に選ばれている人なら、選択はそのまま(まとめて選んだ何人かへ当てるため)。
 */
export function StageContextMenu({ children }: Props) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<ContextMenuTarget["kind"] | null>(null);
  /* 押された場所。開くかどうかを決める瞬間には、もう state の更新を
     待っていられないので ref で持つ */
  const pressed = useRef<ContextMenuTarget | null>(null);

  const selectedDancerIds = useUIStore((state) => state.selectedDancerIds);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const positions = useProjectStore(
    (state) =>
      state.positionsBySceneId[selectedSceneId ?? ""] ?? EMPTY_POSITIONS,
  );
  const commitPositions = usePositionCommit();

  /* 選んだ全員が同じ向きなら、その升に印が付く。ばらばらなら印は付かない */
  const sharedStageAngle = useMemo(
    () =>
      sharedFacing(
        selectedDancerIds
          .map((dancerId) => positions[dancerId]?.rotationAngle)
          .filter((angle): angle is number => angle !== undefined),
      ),
    [selectedDancerIds, positions],
  );
  /* 升は画面の向きで並んでいるので、印を付ける前に画面の向きへ写し戻す
     (上下の鏡は逆写像も同じ関数) */
  const checkedScreenAngle =
    sharedStageAngle === null
      ? ""
      : String(toStageFacing(sharedStageAngle, isAudienceOnTop));

  const hitTest = useCallback((eventTarget: EventTarget | null) => {
    pressed.current = resolveContextMenuTarget(eventTarget);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setIsOpen(false);
      setTarget(null);
      return;
    }

    const hit = pressed.current;
    if (!hit) return;

    if (hit.kind === "dancer") {
      const ui = useUIStore.getState();
      // 選んでいない人を右クリックしたら、その人だけに選び直す。
      // 既に選ばれているなら、まとめて選んだ分をそのまま残す
      if (!ui.selectedDancerIds.includes(hit.dancerId)) {
        ui.selectDancer(hit.dancerId);
      }
    }

    setTarget(hit.kind);
    setIsOpen(true);
  }, []);

  /** 升を押したとき。押されたのは画面の向きなので、ステージの向きへ写して保存する */
  const applyFacing = useCallback(
    async (screenAngle: number) => {
      if (!selectedSceneId) return;
      await commitPositions({
        changes: facingChanges({
          sceneId: selectedSceneId,
          dancerIds: useUIStore.getState().selectedDancerIds,
          positions:
            useProjectStore.getState().positionsBySceneId[selectedSceneId] ??
            {},
          rotationAngle: toStageFacing(screenAngle, isAudienceOnTop),
        }),
        kind: "rotate",
        errorMessage: t.editor.errors.rotation,
      });
    },
    [selectedSceneId, isAudienceOnTop, commitPositions, t],
  );

  /**
   * 整列を当てる。行き先の決め方は lib/alignment.ts が持っている
   * （重心へ揃える / 両端を残して等間隔に配る）。
   */
  const applyAlignment = useCallback(
    async (axis: AlignAxis, mode: AlignMode) => {
      if (!selectedSceneId) return;
      await commitPositions({
        changes: alignmentChanges({
          sceneId: selectedSceneId,
          dancerIds: useUIStore.getState().selectedDancerIds,
          positions:
            useProjectStore.getState().positionsBySceneId[selectedSceneId] ??
            {},
          axis,
          mode,
        }),
        kind: "align",
        errorMessage: t.editor.errors.position,
      });
    },
    [selectedSceneId, commitPositions, t],
  );
  /* 確認から後片付けまでは features/dancer 側が持っている */
  const deleteDancers = useDeleteDancers();
  const handleDelete = useCallback(() => {
    deleteDancers(useUIStore.getState().selectedDancerIds);
  }, [deleteDancers]);

  /* 選ぶのは**いまのシーンに立っている人**だけ。立ち位置を持たない人を
     混ぜると、整列も向きも効かないのに選ばれている状態になる */
  const handleSelectAll = useCallback(() => {
    if (!selectedSceneId) return;
    const project = useProjectStore.getState();
    useUIStore
      .getState()
      .selectDancers(
        dancerIdsInScene(
          Object.keys(project.dancers),
          project.positionsBySceneId[selectedSceneId] ?? {},
        ),
      );
  }, [selectedSceneId]);

  const handleAddDancer = useCallback(() => {
    useUIStore.getState().setAddDancerSheetOpen(true);
  }, []);

  const selectedCount = selectedDancerIds.length;

  return (
    <ContextMenu open={isOpen} onOpenChange={handleOpenChange}>
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
            <ContextMenuRadioGroup
              value={checkedScreenAngle}
              onValueChange={(value) => void applyFacing(Number(value))}
              className="mx-auto grid w-fit grid-cols-3 grid-rows-3 gap-0.5 p-0.5"
            >
              {FACING_DIRECTIONS_IN_READING_ORDER.map((direction) => {
                const labelKey = facingLabelKey(
                  toStageFacing(direction.screenAngle, isAudienceOnTop),
                );
                const label = labelKey
                  ? t.editor.contextMenu.facing[labelKey]
                  : "";
                return (
                  <ContextMenuRadioItem
                    key={direction.screenAngle}
                    value={String(direction.screenAngle)}
                    aria-label={t.editor.contextMenu.facing.turn(label)}
                    className="h-9 w-9"
                    style={{
                      gridRow: direction.cell.row,
                      gridColumn: direction.cell.column,
                    }}
                  >
                    {/* 0度は画面の下なので、下向きの矢印をそのまま回す */}
                    <ArrowDown
                      size={16}
                      aria-hidden
                      style={{
                        transform: `rotate(${direction.screenAngle}deg)`,
                      }}
                    />
                  </ContextMenuRadioItem>
                );
              })}
              {/* 真ん中は本人の居る升。押せるものではないので印だけ置く */}
              <span
                aria-hidden
                className="col-start-2 row-start-2 m-auto h-2 w-2 rounded-full bg-fg-muted"
              />
            </ContextMenuRadioGroup>

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
              onSelect={handleDelete}
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
            <ContextMenuItem onSelect={handleSelectAll}>
              <Users size={16} aria-hidden className="shrink-0" />
              <span>{t.editor.contextMenu.selectAll}</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleAddDancer}>
              <UserPlus size={16} aria-hidden className="shrink-0" />
              <span>{t.editor.contextMenu.addDancer}</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
