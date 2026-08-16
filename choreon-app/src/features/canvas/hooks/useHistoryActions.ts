import { useCallback } from 'react';

import {
  useHistoryStore,
  type HistoryEntry,
} from '@/features/canvas/store/useHistoryStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist } from '@/features/project/lib/persistence';
import { upsertPositions } from '@/features/scene/api/positions';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 履歴を1ステップ戻す／やり直す。
 *
 * ■ 戻したことも保存する
 * 以前はここが**画面だけ**を書き換えていた。移動は保存されるのに、
 * 戻したことは保存されない — つまり **間違えて動かしたものを元に戻して、
 * 直ったように見えたまま、間違った位置の方がサーバーに残る**。
 * 次に開いたときに戻っていて、しかもそのときには履歴も消えている。
 *
 * ■ 失敗したら、画面も履歴も動かす前へ戻す
 * 履歴のスタックは既に1つ進んで（戻って）いるので、保存に失敗したら
 * そこも戻す（`cancelUndo` / `cancelRedo`）。これが無いと、画面は元の
 * 位置なのに履歴だけが1つずれる。
 *
 * ■ 消えた対象へは書き戻さない
 * 履歴を積んだあとにシーンやダンサーを消していることがある。そのまま
 * 書き戻すと、居ないはずの人が1シーンだけ復活して見える（外部キーにも
 * 引っかかる）。
 *
 * ■ 再生は止めてから
 * 再生中に履歴を動かすと、シーンの自動送りと取り合いになる。
 */
export function useHistoryActions() {
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectScene = useUIStore((state) => state.selectScene);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);

  const apply = useCallback(
    async (entry: HistoryEntry, direction: 'undo' | 'redo') => {
      const { scenes, dancers } = useProjectStore.getState();
      const sceneIds = new Set(scenes.map((scene) => scene.id));
      const changes = entry.changes.filter(
        (change) =>
          sceneIds.has(change.sceneId) && dancers[change.dancerId] !== undefined,
      );
      if (changes.length === 0) {
        showToast({ message: getT().history.targetGone, type: 'error' });
        // 積まれていた1件は使い切った扱いにする（何度押しても同じ知らせが
        // 出るだけになるため）
        return true;
      }

      const pick = (change: (typeof changes)[number]) =>
        direction === 'undo' ? change.before : change.after;
      const revert = (change: (typeof changes)[number]) =>
        direction === 'undo' ? change.after : change.before;

      // 変化が見えるよう、対象のシーンへ移ってから反映する
      if (useUIStore.getState().selectedSceneId !== changes[0].sceneId) {
        selectScene(changes[0].sceneId);
      }

      for (const change of changes) {
        updateDancerPosition(change.sceneId, change.dancerId, pick(change));
      }

      try {
        await persist((client) => upsertPositions(client, changes.map(pick)));
        return true;
      } catch {
        for (const change of changes) {
          updateDancerPosition(change.sceneId, change.dancerId, revert(change));
        }
        showToast({
          message:
            direction === 'undo' ? getT().history.undoFailed : getT().history.redoFailed,
          type: 'error',
        });
        return false;
      }
    },
    [selectScene, showToast, updateDancerPosition],
  );

  const undo = useCallback(async () => {
    setIsPlaying(false);
    const entry = useHistoryStore.getState().undo();
    if (!entry) return;
    const applied = await apply(entry, 'undo');
    if (!applied) useHistoryStore.getState().cancelUndo();
  }, [apply, setIsPlaying]);

  const redo = useCallback(async () => {
    setIsPlaying(false);
    const entry = useHistoryStore.getState().redo();
    if (!entry) return;
    const applied = await apply(entry, 'redo');
    if (!applied) useHistoryStore.getState().cancelRedo();
  }, [apply, setIsPlaying]);

  return { undo, redo };
}
