import { Pressable, ScrollView, Text, View } from 'react-native';

import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { createScene } from '@/features/scene/api/scenes';
import { upsertPositions } from '@/features/scene/api/positions';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { getT, useT } from '@/features/i18n/store/useLocaleStore';
import { duplicateTimeSeconds } from '@/features/scene/lib/sceneTiming';
import { randomId } from '@/lib/randomId';

/**
 * 画面下の、シーンを行き来する帯。
 *
 * Web版のドック(SceneDock)は「見る場所」に徹していて、名前の書き換えは
 * 一覧のカードが持つ。ここも同じ役割分担にしてある — 押せるのは
 * 【どのシーンを見るか】と【足す】の2つだけ。
 *
 * ■ 足したシーンは、いまの配置をコピーする
 * フォーメーションは少しずつ変わっていくものなので、毎回ゼロから置き直す
 * のは不自然（Web版 useAddScene と同じ判断）。置く時刻も同じ計算
 * (duplicateTimeSeconds)を使う。曲がまだ無いので、常に「選んでいるシーンの
 * 隣」に入る。
 */
export function SceneDock() {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const defaultSegmentSeconds = useSettingsStore((state) => state.defaultSegmentSeconds);

  const handleAdd = async () => {
    const source = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[scenes.length - 1];
    if (!source) return;

    const id = randomId();
    const created = {
      id,
      projectId: source.projectId,
      name: t.scenes.newName(scenes.length + 1),
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
      // 作れなかったら画面からも消す。**中途半端に残さない** —
      // 画面にあるのにサーバーに無いシーンは、次に開いたときに消えて見える
      removeScene(id);
      selectScene(source.id);
      useUIStore
        .getState()
        .showToast({ message: getT().scenes.addFailed, type: 'error' });
    }
  };

  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-3">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">{t.scenes.section}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <Pressable
              key={scene.id}
              onPress={() => selectScene(scene.id)}
              className={`min-w-24 rounded-xl px-3 py-2 active:opacity-80 ${
                isSelected ? 'border-2 border-accent bg-accent-row' : 'border border-line bg-surface-raised'
              }`}
            >
              <Text
                className={`font-mono text-[10px] ${
                  isSelected ? 'text-accent-soft' : 'text-fg-muted'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text className="text-sm text-fg-strong">{scene.name}</Text>
              <Text className="font-mono text-[10px] text-fg-muted">
                {scene.timeSeconds.toFixed(1)}s
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => void handleAdd()}
          className="min-w-14 items-center justify-center rounded-xl border border-dashed border-line-strong px-3 py-2 active:opacity-80"
        >
          <Text className="text-lg text-fg-sub">＋</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
