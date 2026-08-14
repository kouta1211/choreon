import { useCallback } from 'react';

import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { createScene } from '@/features/scene/api/scenes';
import { upsertPositions } from '@/features/scene/api/positions';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { getT } from '@/features/i18n/store/useLocaleStore';
import { duplicateTimeSeconds } from '@/features/scene/lib/sceneTiming';
import { randomId } from '@/lib/randomId';

/**
 * シーンを足す。**帯（狭い画面）と一覧（広い画面）の両方から呼ぶ**ので、
 * 画面から切り離してある（Web版にも同名のフックがある）。
 *
 * ■ 足したシーンは、いまの配置をコピーする
 * フォーメーションは少しずつ変わっていくものなので、毎回ゼロから置き直す
 * のは不自然。置く時刻も同じ計算（`duplicateTimeSeconds`）を使う。
 *
 * ■ 失敗したら画面からも消す
 * **中途半端に残さない** — 画面にあるのにサーバーに無いシーンは、
 * 次に開いたときに消えて見える。
 */
export function useAddScene() {
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const defaultSegmentSeconds = useSettingsStore((state) => state.defaultSegmentSeconds);

  return useCallback(async () => {
    const source =
      scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[scenes.length - 1];
    if (!source) return;

    const id = randomId();
    const created = {
      id,
      projectId: source.projectId,
      name: getT().scenes.newName(scenes.length + 1),
      orderIndex: scenes.length,
      // 並び順の正は時刻。選んでいるシーンの隣へ入れる
      timeSeconds: duplicateTimeSeconds(scenes, source, defaultSegmentSeconds),
    };
    addScene(created);

    // いまの配置をそのままコピーする
    const copied = Object.values(positionsBySceneId[source.id] ?? {}).map((position) => ({
      sceneId: id,
      dancerId: position.dancerId,
      xCoordinate: position.xCoordinate,
      yCoordinate: position.yCoordinate,
      rotationAngle: position.rotationAngle,
    }));
    for (const position of copied) {
      updateDancerPosition(id, position.dancerId, position);
    }
    selectScene(id);

    try {
      // シーンを作ってから立ち位置を入れる（外部キーの順番）。
      // まとめて並列に投げられないのはこのため
      await persist(async (client) => {
        await createScene(client, created);
        await upsertPositions(client, copied);
      });
    } catch {
      removeScene(id);
      selectScene(source.id);
      useUIStore.getState().showToast({ message: getT().scenes.addFailed, type: 'error' });
    }
  }, [
    scenes,
    positionsBySceneId,
    addScene,
    removeScene,
    updateDancerPosition,
    selectedSceneId,
    selectScene,
    defaultSegmentSeconds,
  ]);
}
