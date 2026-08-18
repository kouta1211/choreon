"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/** 入力中はショートカットを効かせない要素。Spaceで空白を打てないと困る */
function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * 画面ぜんたいのキーボード操作。描画は持たない。
 *
 *   Space … 再生 / 停止
 *   ← →  … 前後のシーンへ
 *   Esc  … 選択解除、開いているシート・ダイアログを閉じる
 *
 * ダンサーの矢印キー微調整(DraggableDancerIcon)と履歴のCtrl+Z
 * (HistoryControls)は、対象が決まっている操作なのでそれぞれの持ち場に置く。
 * ここに集めるのは「いま何を選んでいても同じように効く」ものだけ。
 *
 * ←→ は、ダンサーを選んでいる間は取り合いになる(そちらは選択中の人を
 * 動かす)。選択中は何もしないことでダンサー側に譲る。
 */
export function EditorShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryElement(event.target)) return;
      // 修飾キー付きは履歴など別の担当に任せる
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const ui = useUIStore.getState();

      if (event.key === "Escape") {
        if (ui.confirm) return; // ダイアログ自身が閉じる
        if (ui.isTemplateSheetOpen) {
          event.preventDefault();
          ui.setTemplateSheetOpen(false);
          return;
        }
        if (ui.isAddDancerSheetOpen) {
          event.preventDefault();
          ui.setAddDancerSheetOpen(false);
          return;
        }
        if (ui.isSceneSheetOpen) {
          event.preventDefault();
          ui.setSceneSheetOpen(false);
          return;
        }
        if (ui.selectedDancerIds.length > 0) {
          event.preventDefault();
          // 何人選んでいても、Esc 1回でまとめて解除する
          ui.selectDancer(null);
        }
        return;
      }

      // シートが開いている間は、その中の操作を邪魔しない
      if (
        ui.isTemplateSheetOpen ||
        ui.isAddDancerSheetOpen ||
        ui.isSceneSheetOpen ||
        ui.confirm
      ) {
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        // isPlaying を直に立てない。予備拍(カウントイン)を挟むかどうかの
        // 判断はドックが持っているので、押されたことだけを伝える。
        // ここで立ててしまうと、設定で予備拍を入れている人だけ
        // 「ボタンでは数えるのにスペースキーでは数えない」ことになる
        ui.requestTogglePlay();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // ダンサーを選んでいる間は、矢印キーはその人の微調整に使う
        if (ui.selectedDancerIds.length > 0) return;

        const scenes = useProjectStore.getState().scenes;
        const index = scenes.findIndex(
          (scene) => scene.id === ui.selectedSceneId,
        );
        if (index === -1) return;
        const nextIndex = event.key === "ArrowLeft" ? index - 1 : index + 1;
        const next = scenes[nextIndex];
        if (!next) return;

        event.preventDefault();
        ui.setIsPlaying(false);
        ui.selectScene(next.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
