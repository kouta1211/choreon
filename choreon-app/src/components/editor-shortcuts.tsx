import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';

/**
 * キーボードの操作。描くものは持たない。
 *
 *   Space … 再生 / 停止
 *   ← →  … 前後のシーンへ
 *   Esc  … 選択を外す
 *
 * ■ どこで効くか
 * **キーボードがある面だけ**。スマホ本体には物理キーが無く、React Native
 * にも「画面ぜんたいのキー入力」を受ける口が無い。効くのは Expo web で
 * 開いたときと、キーボードを繋いだ端末（iPad など）。触る画面では何も
 * 起きないが、それが正しい — 出せない操作を出さない。
 *
 * ■ 再生は【頼むだけ】
 * `isPlaying` を直に立てない。予備拍（カウントイン）を挟むかどうかの
 * 判断は再生のところが持っているので、押されたことだけを伝える
 * （`requestTogglePlay`）。ここで立ててしまうと、予備拍を入れている人だけ
 * **「ボタンでは数えるのにスペースキーでは数えない」**ことになる。
 *
 * ■ ←→ はダンサーに譲る
 * 誰かを選んでいる間は、矢印キーはその人の微調整に使う。
 */
export function EditorShortcuts() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 打っている最中は効かせない。Space で空白が打てないと困る
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const ui = useUIStore.getState();

      // 確認の板が出ている間は、その板の操作を邪魔しない
      if (ui.confirm) return;

      if (event.key === 'Escape') {
        if (ui.selectedDancerId) {
          event.preventDefault();
          ui.selectDancer(null);
        }
        return;
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        ui.requestTogglePlay();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (ui.selectedDancerId) return;

        const scenes = useProjectStore.getState().scenes;
        const index = scenes.findIndex((scene) => scene.id === ui.selectedSceneId);
        if (index === -1) return;
        const next = scenes[event.key === 'ArrowLeft' ? index - 1 : index + 1];
        if (!next) return;

        event.preventDefault();
        ui.setIsPlaying(false);
        ui.selectScene(next.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
