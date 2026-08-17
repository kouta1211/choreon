"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useClearBlindSpot } from "@/features/canvas/hooks/useClearBlindSpot";
import { useExtendMoveTime } from "@/features/canvas/hooks/useExtendMoveTime";
import { useApplyTemplate } from "@/features/canvas/hooks/useApplyTemplate";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import {
  DEFAULT_TRANSFORM,
  templatesForCount,
} from "@/features/canvas/lib/formationTemplates";
import { formationName } from "@/features/i18n/lib/formationName";
import { needsConfirm, type AssistAction } from "@/features/assist/lib/actions";
import { useT } from "@/features/i18n/LocaleProvider";
import type { Project } from "@/features/project/types";

/**
 * 選ばれた操作を、**やることが読める計画**に変える。
 *
 * ■ 数字を書くのはここ（AI ではない）
 * 「2番を 5.0 → 3.4 へ」の数字は、ぜんぶこの中で計算している。
 * AI が返すのは操作の名前だけなので、**画面に出る数字は必ずアプリの
 * 計算**になる。ここを AI に書かせると、当たっていない数字が並ぶ。
 *
 * ■ 確認を出すのは、作品を書き換えるものだけ
 * 表示の切り替えと「開く」は1タップで戻せるので、確認を挟むと頼むより
 * 自分で押した方が早い（それでは助けになっていない）。書き換えるものは
 * 押すまで何も起きず、当てても**元に戻す1回**で消える。
 *
 * ■ 何も起きないと分かったら、計画を作らない
 * 顔被りが0人、逃げ場が無い、延ばす必要が無い — そういうときは null を
 * 返して「いまは要りません」と言う。押しても何も起きないボタンは出さない。
 */

export type AssistPlan = {
  /** 「顔被りを直す（3人）」のような、やることの見出し */
  title: string;
  /** 1行ずつ、実際に変わるもの。アプリが計算した数字が入る */
  lines: string[];
  /** 押すまで実行しない。確認が要らない操作は、呼ぶ側がすぐ呼ぶ */
  run: () => void | Promise<void>;
  needsConfirm: boolean;
};

export function useAssistPlan(project: Project) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const setGridMode = useUIStore((state) => state.setGridMode);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);
  const toggleBlindSpotCheck = useUIStore(
    (state) => state.toggleBlindSpotCheck,
  );
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const setMusicSheetOpen = useUIStore((state) => state.setMusicSheetOpen);
  const setExportSheetOpen = useUIStore((state) => state.setExportSheetOpen);
  const setTemplateSheetOpen = useUIStore((state) => state.setTemplateSheetOpen);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );

  const { suggestXFor, moveOut } = useClearBlindSpot();
  const { suggestFor, extendTo } = useExtendMoveTime();
  const { applyTemplate } = useApplyTemplate(project);

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;
  const positions = scene ? (positionsBySceneId[scene.id] ?? {}) : {};

  const round = (value: number) => Math.round(value * 10) / 10;
  const nameOf = (dancerId: string) => dancers[dancerId]?.name ?? "?";

  /** 顔被りを直す計画。逃げ場が無い人は動かさないと明記する */
  const blindSpotPlan = (): AssistPlan | null => {
    if (!scene) return null;
    const blocked = [...findBlockedDancerIds(positions)];
    if (blocked.length === 0) return null;

    const movable = blocked.flatMap((dancerId) => {
      const before = positions[dancerId];
      const to = suggestXFor(dancerId, scene.id);
      if (!before || to === null) return [];
      return [{ dancerId, from: before.xCoordinate, to }];
    });
    const stuck = blocked.filter(
      (dancerId) => !movable.some((item) => item.dancerId === dancerId),
    );
    // 1人も動かせないなら、押しても何も起きない
    if (movable.length === 0) return null;

    return {
      title: t.assist.plan.clearBlindSpots(movable.length),
      lines: [
        ...movable.map((item) =>
          t.assist.plan.movesSideways(
            nameOf(item.dancerId),
            round(item.from),
            round(item.to),
          ),
        ),
        ...stuck.map((dancerId) => t.assist.plan.noEscape(nameOf(dancerId))),
        t.assist.plan.thisSceneOnly,
      ],
      needsConfirm: true,
      run: async () => {
        // 1人ずつ当てる。途中で失敗しても、そこまでは残る
        for (const item of movable) {
          await moveOut(item.dancerId, scene.id);
        }
      },
    };
  };

  /** 速すぎる移動に時間を足す計画。延ばすのは「次のシーンの時刻」 */
  const fastMovePlan = (): AssistPlan | null => {
    if (!scene) return null;
    const nextScene = scenes[index + 1] ?? null;
    if (!nextScene) return null;
    const segmentSeconds = nextScene.timeSeconds - scene.timeSeconds;
    if (segmentSeconds <= 0) return null;

    const strains = findExcessiveMoves(
      positions,
      positionsBySceneId[nextScene.id] ?? {},
      segmentSeconds,
    );
    if (strains.size === 0) return null;

    /* いちばん厳しい移動に合わせる。**1件ずつ別の秒数にはできない** —
       区間の秒数は1つなので、いちばん時間の要る人に合わせれば全員が収まる */
    let seconds: number | null = null;
    for (const strain of strains.values()) {
      const suggested = suggestFor(strain, scene.id);
      if (suggested !== null && (seconds === null || suggested > seconds)) {
        seconds = suggested;
      }
    }
    if (seconds === null) return null;

    const target = seconds;
    return {
      title: t.assist.plan.extendFastMoves(strains.size),
      lines: [
        t.assist.plan.retime(nextScene.name, round(segmentSeconds), target),
        ...[...strains.keys()].map((dancerId) =>
          t.assist.plan.walkable(nameOf(dancerId)),
        ),
        t.assist.plan.rippleNote,
      ],
      needsConfirm: true,
      run: () => extendTo(target, scene.id),
    };
  };

  /** 隊形を組み替える計画。人数で組める形しか来ない(actions.ts で検算済み) */
  const formationPlan = (shape: string): AssistPlan | null => {
    const dancerCount = Object.keys(positions).length;
    const template = templatesForCount(dancerCount).find(
      (item) => item.label.shape === shape,
    );
    if (!template) return null;

    return {
      title: t.assist.plan.applyFormation(
        formationName(template.label, t),
        dancerCount,
      ),
      lines: [t.assist.plan.nearestAssignment, t.assist.plan.thisSceneOnly],
      needsConfirm: true,
      run: () => applyTemplate(template, DEFAULT_TRANSFORM),
    };
  };

  /** 表示の切り替え。すでにその状態なら、何もしないと言う */
  const togglePlan = (
    target: "paths" | "blindSpot" | "marks",
    on: boolean,
  ): AssistPlan | null => {
    const current = {
      paths: isPathVisible,
      blindSpot: isBlindSpotCheckVisible,
      marks: isStageMarksVisible,
    }[target];
    const toggle = {
      paths: togglePathVisible,
      blindSpot: toggleBlindSpotCheck,
      marks: toggleStageMarks,
    }[target];
    const label = t.assist.targets[target];

    if (current === on) {
      return {
        title: on ? t.assist.plan.alreadyOn(label) : t.assist.plan.alreadyOff(label),
        lines: [],
        needsConfirm: false,
        run: () => {},
      };
    }
    return {
      title: on ? t.assist.plan.turnedOn(label) : t.assist.plan.turnedOff(label),
      lines: [],
      needsConfirm: false,
      run: toggle,
    };
  };

  const openPlan = (
    target: "music" | "share" | "video" | "settings" | "review" | "template" | "addDancer",
    onOpenSheet: (target: "share" | "review" | "settings") => void,
  ): AssistPlan => {
    const opens: Record<typeof target, () => void> = {
      music: () => setMusicSheetOpen(true),
      video: () => setExportSheetOpen(true),
      template: () => setTemplateSheetOpen(true),
      addDancer: () => setAddDancerSheetOpen(true),
      share: () => onOpenSheet("share"),
      review: () => onOpenSheet("review"),
      settings: () => onOpenSheet("settings"),
    };
    return {
      title: t.assist.plan.opened(t.assist.targets[target]),
      lines: [],
      needsConfirm: false,
      run: opens[target],
    };
  };

  /**
   * 操作 → 計画。null は「いまは何もすることが無い」。
   *
   * `onOpenSheet` は、ヘッダーが持っているシート（共有・見てもらう・設定）を
   * 開くための橋。あちらは開閉の状態をヘッダーに置いているため。
   */
  const planFor = (
    action: AssistAction,
    onOpenSheet: (target: "share" | "review" | "settings") => void,
  ): AssistPlan | null => {
    switch (action.kind) {
      case "setGrid": {
        const label =
          t.editor.view[
            (
              {
                square: "gridSquare",
                circle: "gridCircle",
                none: "gridNone",
              } as const
            )[action.grid]
          ];
        return {
          title: t.assist.plan.setGrid(label),
          lines: [],
          needsConfirm: false,
          run: () => setGridMode(action.grid),
        };
      }
      case "setToggle":
        return togglePlan(action.target, action.on);
      case "open":
        return openPlan(action.target, onOpenSheet);
      case "selectScene": {
        const target = scenes[action.sceneNumber - 1];
        if (!target) return null;
        return {
          title: t.assist.plan.selectScene(action.sceneNumber, target.name),
          lines: [],
          needsConfirm: false,
          run: () => selectScene(target.id),
        };
      }
      case "clearBlindSpots":
        return blindSpotPlan();
      case "extendFastMoves":
        return fastMovePlan();
      case "applyFormation":
        return formationPlan(action.shape);
      case "none":
        return null;
    }
  };

  return { planFor, needsConfirm };
}
