import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import {
  MIN_SEGMENT_SECONDS,
  retimeScene,
  sceneDurations,
} from '@/features/scene/lib/sceneTiming';

/** ＋ / − で動かす幅。Web版のフィールドは直接入力だが、指では押しやすさが要る */
const STEP_SECONDS = 0.5;

/**
 * 選んでいるシーンの、名前・入ってくる時間・削除。
 *
 * ■ 時刻ではなく「入ってくる時間」を触る
 * シーンが持っているのは**曲の何秒目か**だが、稽古で意識するのは
 * 「前の隊形から何秒で移るか」。そこを直接動かせる形にした（Web版の
 * 一覧も同じ考えで、間隔と時刻の両方を出している）。計算は Web版の
 * `retimeScene` をそのまま呼ぶので、詰まったときの止まりかたも同じ。
 *
 * ■ 先頭のシーンには「入ってくる時間」が無い
 * 前が無いので、そこだけ ± を出さない（`retimeScene` も index<=0 では
 * 何もしない）。
 *
 * ■「以降もずらす」は既定でオフ
 * Web版のフィールドと同じ既定。オフのときは次のシーンを押しのけず、
 * 手前の余地いっぱいで止まる。
 *
 * ■ 消すのは2回押し
 * ダンサーと同じ形。`Alert.alert` は Web で何も出ないため、確認は画面の中。
 */
export function SceneEditor() {
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const renameScene = useProjectStore((state) => state.renameScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index === -1 ? undefined : scenes[index];

  // 入力中の名前。**選んでいるシーンが変わったら入れ替える**（前のシーンの
  // 名前が残っていると、続けて打った文字が別のシーンへ入る）
  const [name, setName] = useState(scene?.name ?? '');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    setName(scene?.name ?? '');
    setIsConfirmingDelete(false);
  }, [scene?.id, scene?.name]);

  if (!scene) {
    return (
      <View className="rounded-2xl border border-line bg-surface p-4">
        <Text className="text-xs text-fg-muted">シーンを1つ選ぶと、ここで直せます</Text>
      </View>
    );
  }

  const durations = sceneDurations(scenes);
  const segment = durations[index] ?? 0;
  const isFirst = index === 0;

  const changeSegment = (delta: number) => {
    const next = Math.max(MIN_SEGMENT_SECONDS, segment + delta);
    applySceneTimes(retimeScene(scenes, index, next, ripple).timesById);
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    const remaining = scenes.filter((other) => other.id !== scene.id);
    removeScene(scene.id);
    // 残っているうち先頭を選ぶ（Web版 confirmDelete と同じ）
    selectScene(remaining[0]?.id ?? null);
    setIsConfirmingDelete(false);
  };

  const dancerCount = Object.keys(positionsBySceneId[scene.id] ?? {}).length;

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        シーン {String(index + 1).padStart(2, '0')} を直す
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        // 打っている途中で毎文字ストアへ入れると、一覧の並びが指の下で
        // ちらつく。手を離した時点で確定する
        onBlur={() => renameScene(scene.id, name.trim() === '' ? scene.name : name.trim())}
        onSubmitEditing={() =>
          renameScene(scene.id, name.trim() === '' ? scene.name : name.trim())
        }
        returnKeyType="done"
        accessibilityLabel="シーンの名前"
        className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-base text-fg-strong"
      />

      {isFirst ? (
        <Text className="text-xs leading-5 text-fg-muted">
          先頭のシーンには「入ってくる時間」がありません（前の隊形が無いため）。
          曲の何秒目かは {scene.timeSeconds.toFixed(1)} 秒です。
        </Text>
      ) : (
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-sm text-fg">前の隊形から入ってくる時間</Text>
            <Pressable
              onPress={() => changeSegment(-STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel="入ってくる時間を短く"
              className="h-10 w-10 items-center justify-center rounded-xl border border-line-strong active:opacity-80"
            >
              <Text className="text-lg text-fg">−</Text>
            </Pressable>
            <Text className="w-16 text-center font-mono text-base text-fg-strong">
              {segment.toFixed(1)}s
            </Text>
            <Pressable
              onPress={() => changeSegment(STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel="入ってくる時間を長く"
              className="h-10 w-10 items-center justify-center rounded-xl border border-line-strong active:opacity-80"
            >
              <Text className="text-lg text-fg">＋</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setRipple(!ripple)}
            accessibilityRole="button"
            accessibilityLabel="以降のシーンもずらす"
            accessibilityState={{ selected: ripple }}
            className="flex-row items-center justify-between rounded-xl bg-surface-raised px-4 py-3 active:opacity-80"
          >
            <Text className="flex-1 text-sm text-fg">以降のシーンもずらす</Text>
            <Text className="text-sm font-semibold text-accent-soft">
              {ripple ? 'オン' : 'オフ'}
            </Text>
          </Pressable>
          <Text className="text-xs leading-5 text-fg-muted">
            オフのときは次のシーンを押しのけず、手前の余地いっぱいで止まります。
            曲の {scene.timeSeconds.toFixed(1)} 秒目。
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        className="self-start rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
      >
        <Text className="text-sm text-fg">
          {isConfirmingDelete
            ? `本当に「${scene.name}」を消す（${dancerCount}人ぶんの立ち位置も消えます）`
            : 'このシーンを消す'}
        </Text>
      </Pressable>
    </View>
  );
}
