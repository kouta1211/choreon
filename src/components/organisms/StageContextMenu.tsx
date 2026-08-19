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
import { persist } from "@/features/project/lib/persistence";
import { deleteDancers } from "@/features/dancer/api/dancers";
import { toUserMessage } from "@/lib/supabase/errors";
import { EMPTY_POSITIONS } from "@/features/canvas/constants";
import {
  FACING_DIRECTIONS_IN_READING_ORDER,
  facingLabelKey,
  sharedFacing,
  toStageFacing,
} from "@/features/canvas/lib/facing";
import {
  alignmentTarget,
  evenlyDistributed,
  type AlignAxis,
} from "@/features/canvas/lib/alignment";
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

/** 右クリックが何の上で起きたか */
type MenuTarget = "dancer" | "stage";

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
  const [target, setTarget] = useState<MenuTarget | null>(null);
  /* 押された場所。開くかどうかを決める瞬間には、もう state の更新を
     待っていられないので ref で持つ */
  const pressed = useRef<{
    target: MenuTarget;
    dancerId: string | null;
  } | null>(null);

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
    const element = eventTarget instanceof Element ? eventTarget : null;
    /* ボタン・リンク・入力欄はそれぞれの持ち主に譲る（囲んで選ぶ側と同じ除外）。
       ステージの下のボタン列（テンプレート・元に戻す）は、**DOM の上では
       ステージ面の中に居る**（枠のすぐ下へ絶対配置しているため）ので、
       ここで降りないと地のメニューが出てしまう */
    if (element?.closest("button, a, input")) {
      pressed.current = null;
      return;
    }
    const dancerElement = element?.closest("[data-dancer-id]");
    const dancerId = dancerElement?.getAttribute("data-dancer-id");
    if (dancerId) {
      pressed.current = { target: "dancer", dancerId };
      return;
    }
    if (element?.closest("[data-testid='stage']")) {
      pressed.current = { target: "stage", dancerId: null };
      return;
    }
    // ステージの外(下のボタン列・見出し)。ここでは開かない
    pressed.current = null;
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setIsOpen(false);
      setTarget(null);
      return;
    }

    const hit = pressed.current;
    if (!hit) return;

    if (hit.dancerId) {
      const ui = useUIStore.getState();
      // 選んでいない人を右クリックしたら、その人だけに選び直す。
      // 既に選ばれているなら、まとめて選んだ分をそのまま残す
      if (!ui.selectedDancerIds.includes(hit.dancerId)) {
        ui.selectDancer(hit.dancerId);
      }
    }

    setTarget(hit.target);
    setIsOpen(true);
  }, []);

  /** 升を押したとき。押されたのは画面の向きなので、ステージの向きへ写して保存する */
  const applyFacing = useCallback(
    async (screenAngle: number) => {
      if (!selectedSceneId) return;
      const stageAngle = toStageFacing(screenAngle, isAudienceOnTop);
      const { selectedDancerIds: ids } = useUIStore.getState();
      const current =
        useProjectStore.getState().positionsBySceneId[selectedSceneId] ?? {};

      const changes = ids.flatMap((dancerId) => {
        const before = current[dancerId];
        // 既にその向きの人は触らない(履歴に「何も変わらない1手」を積まない)
        if (!before || before.rotationAngle === stageAngle) return [];
        return [
          {
            sceneId: selectedSceneId,
            dancerId,
            before,
            after: { ...before, rotationAngle: stageAngle },
          },
        ];
      });

      await commitPositions({
        changes,
        kind: "rotate",
        errorMessage: t.editor.errors.rotation,
      });
    },
    [selectedSceneId, isAudienceOnTop, commitPositions, t],
  );

  /**
   * 選んだ人たちを揃える / 等間隔に配る。
   *
   * **格子へは丸めない。** 揃えると言われて半マス動かされるより、頼まれた
   * 通りの位置に置く方が読める（等間隔は丸めると間隔そのものが崩れる）。
   * 格子に乗せたいときは、そのあと矢印キーで動かす道がある。
   *
   * 平均も等間隔も**両端の内側**にしか来ないので、ステージからはみ出さない
   * （はみ出していた人が居ても、揃えた先はその人より内側になる）。
   */
  const applyAlignment = useCallback(
    async (axis: AlignAxis, mode: "align" | "distribute") => {
      if (!selectedSceneId) return;
      const { selectedDancerIds: ids } = useUIStore.getState();
      const current =
        useProjectStore.getState().positionsBySceneId[selectedSceneId] ?? {};

      const points = ids.flatMap((dancerId) => {
        const position = current[dancerId];
        return position
          ? [
              {
                dancerId,
                x: position.xCoordinate,
                y: position.yCoordinate,
              },
            ]
          : [];
      });

      const target = mode === "align" ? alignmentTarget(points, axis) : null;
      const distributed =
        mode === "distribute"
          ? evenlyDistributed(points, axis)
          : new Map<string, number>();
      const nextValue = (dancerId: string): number | undefined =>
        mode === "distribute"
          ? distributed.get(dancerId)
          : (target ?? undefined);

      const key = axis === "x" ? "xCoordinate" : "yCoordinate";
      const changes = ids.flatMap((dancerId) => {
        const before = current[dancerId];
        const value = nextValue(dancerId);
        // 動かない人は履歴にも保存にも混ぜない
        if (!before || value === undefined || before[key] === value) return [];
        return [
          {
            sceneId: selectedSceneId,
            dancerId,
            before,
            after: { ...before, [key]: value },
          },
        ];
      });

      await commitPositions({
        changes,
        kind: "align",
        errorMessage: t.editor.errors.position,
      });
    },
    [selectedSceneId, commitPositions, t],
  );
  /**
   * 選んだ人をまとめて消す。
   *
   * 他の編集と違って「確定後更新」にしている(先に Supabase から消えてから
   * ローカルを更新する)。DancerInspector の削除と同じ理由 —
   * 巻き戻しが「消したものを全シーンぶん復元する」処理になるうえ、
   * 「消えた→やっぱり戻った」というチラつきが体験を損ねやすい。
   */
  const handleDelete = useCallback(() => {
    const ui = useUIStore.getState();
    const ids = [...ui.selectedDancerIds];
    if (ids.length === 0) return;

    const project = useProjectStore.getState();
    // 巻き添えで消える配置の数。store を数えるだけなので問い合わせは要らない
    const positionCount = Object.values(project.positionsBySceneId).reduce(
      (count, scenePositions) =>
        count + ids.filter((id) => scenePositions[id] !== undefined).length,
      0,
    );
    const firstName = project.dancers[ids[0]]?.name ?? "";

    ui.requestConfirm({
      title:
        ids.length === 1
          ? t.dancer.inspector.deleteTitle(firstName)
          : t.editor.contextMenu.deleteManyTitle(ids.length),
      description: t.dancer.inspector.deleteDescription,
      meta: [
        ids.length === 1
          ? t.dancer.inspector.deleteMeta(positionCount)
          : t.editor.contextMenu.deleteManyMeta(positionCount),
      ],
      onConfirm: async () => {
        try {
          await persist((supabase) => deleteDancers(supabase, ids));
          for (const id of ids) useProjectStore.getState().removeDancer(id);
          const after = useUIStore.getState();
          after.selectDancer(null);
          if (after.focusedDancerId && ids.includes(after.focusedDancerId)) {
            after.setFocusedDancer(null);
          }
        } catch (error) {
          useUIStore.getState().showToast({
            message: toUserMessage(error, t.dancer.inspector.deleteFailed),
            type: "error",
          });
        }
      },
    });
  }, [t]);

  const handleSelectAll = useCallback(() => {
    const dancerIds = Object.keys(useProjectStore.getState().dancers);
    useUIStore.getState().selectDancers(dancerIds);
  }, []);

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
