import { useCallback } from 'react';

import {
  useHistoryStore,
  type HistoryEntry,
} from '@/features/canvas/store/useHistoryStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';

/**
 * 履歴を1ステップ戻す／やり直す。
 *
 * ■ Web版との違いは「保存が無いこと」だけ
 * あちら（`src/features/canvas/hooks/useHistoryActions.ts`）は反映のあと
 * Supabase へ書き、失敗したら見た目も履歴スタックも戻す。ネイティブ版は
 * まだ書き込みを通していないので、**失敗しようがない**ぶん短い。
 * 書き込みを通すときは、`cancelUndo` / `cancelRedo` を使う形をあちらから
 * そのまま持ってくる（ストアには両方とも残してある）。
 *
 * ■ 消えた対象へは書き戻さない
 * 履歴を積んだあとにシーンやダンサーを消していることがある。そのまま
 * 書き戻すと、居ないはずの人が1シーンだけ復活して見える。
 */
export function useHistoryActions() {
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectScene = useUIStore((state) => state.selectScene);

  const apply = useCallback(
    (entry: HistoryEntry, direction: 'undo' | 'redo') => {
      const { scenes, dancers } = useProjectStore.getState();
      const sceneIds = new Set(scenes.map((scene) => scene.id));
      const changes = entry.changes.filter(
        (change) =>
          sceneIds.has(change.sceneId) && dancers[change.dancerId] !== undefined,
      );
      if (changes.length === 0) return;

      // 変化が見えるよう、対象のシーンへ移ってから反映する
      if (useUIStore.getState().selectedSceneId !== changes[0].sceneId) {
        selectScene(changes[0].sceneId);
      }

      for (const change of changes) {
        updateDancerPosition(
          change.sceneId,
          change.dancerId,
          direction === 'undo' ? change.before : change.after,
        );
      }
    },
    [selectScene, updateDancerPosition],
  );

  const undo = useCallback(() => {
    const entry = useHistoryStore.getState().undo();
    if (entry) apply(entry, 'undo');
  }, [apply]);

  const redo = useCallback(() => {
    const entry = useHistoryStore.getState().redo();
    if (entry) apply(entry, 'redo');
  }, [apply]);

  return { undo, redo };
}
