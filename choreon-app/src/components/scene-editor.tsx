import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import {
  deleteScene as deleteSceneApi,
  renameScene as renameSceneApi,
  updateSceneTimes,
} from '@/features/scene/api/scenes';
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
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const renameScene = useProjectStore((state) => state.renameScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

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
        <Text className="text-xs text-fg-muted">{t.scenes.pickOne}</Text>
      </View>
    );
  }

  const durations = sceneDurations(scenes);
  const segment = durations[index] ?? 0;
  const isFirst = index === 0;

  /**
   * 時刻の変更を保存する。**動いたシーンだけ**を送る
   * （全件送ると、触っていない行まで書き換わる。Web版 commitTimes と同じ）。
   */
  const changeSegment = async (delta: number) => {
    const next = Math.max(MIN_SEGMENT_SECONDS, segment + delta);
    const timesById = retimeScene(scenes, index, next, ripple).timesById;
    const changed = scenes
      .filter((other) => {
        const value = timesById.get(other.id);
        return value !== undefined && value !== other.timeSeconds;
      })
      .map((other) => ({ id: other.id, timeSeconds: timesById.get(other.id)! }));
    if (changed.length === 0) return;

    const previous = new Map(scenes.map((other) => [other.id, other.timeSeconds]));
    applySceneTimes(timesById);
    try {
      await persist((client) => updateSceneTimes(client, changed));
    } catch {
      applySceneTimes(previous);
      showToast({ message: t.scenes.retimeFailed, type: 'error' });
    }
  };

  const commitName = async (nextName: string) => {
    const name = nextName.trim() === '' ? scene.name : nextName.trim();
    if (name === scene.name) return;

    const previousName = scene.name;
    renameScene(scene.id, name);
    try {
      await persist((client) => renameSceneApi(client, scene.id, name));
    } catch {
      renameScene(scene.id, previousName);
      showToast({ message: t.scenes.renameFailed, type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    setIsConfirmingDelete(false);

    // 消すのは【保存できてから】。先に消して失敗すると、消えたはずの
    // シーンを画面へ戻すことになり、立ち位置まで復元できない
    try {
      await persist((client) => deleteSceneApi(client, scene.id));
    } catch {
      showToast({ message: t.scenes.removeFailed, type: 'error' });
      return;
    }
    const remaining = scenes.filter((other) => other.id !== scene.id);
    removeScene(scene.id);
    // 残っているうち先頭を選ぶ（Web版 confirmDelete と同じ）
    selectScene(remaining[0]?.id ?? null);
  };

  const dancerCount = Object.keys(positionsBySceneId[scene.id] ?? {}).length;

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.scenes.editTitle(String(index + 1).padStart(2, '0'))}
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        // 打っている途中で毎文字ストアへ入れると、一覧の並びが指の下で
        // ちらつく。手を離した時点で確定する
        onBlur={() => void commitName(name)}
        onSubmitEditing={() => void commitName(name)}
        returnKeyType="done"
        accessibilityLabel={t.scenes.nameLabel}
        className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-base text-fg-strong"
      />

      {isFirst ? (
        <Text className="text-xs leading-5 text-fg-muted">
          {t.scenes.firstNote(scene.timeSeconds.toFixed(1))}
        </Text>
      ) : (
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-sm text-fg">{t.scenes.segment}</Text>
            <Pressable
              onPress={() => void changeSegment(-STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel={t.scenes.shorter}
              className="h-10 w-10 items-center justify-center rounded-xl border border-line-strong active:opacity-80"
            >
              <Text className="text-lg text-fg">−</Text>
            </Pressable>
            <Text className="w-16 text-center font-mono text-base text-fg-strong">
              {segment.toFixed(1)}s
            </Text>
            <Pressable
              onPress={() => void changeSegment(STEP_SECONDS)}
              accessibilityRole="button"
              accessibilityLabel={t.scenes.longer}
              className="h-10 w-10 items-center justify-center rounded-xl border border-line-strong active:opacity-80"
            >
              <Text className="text-lg text-fg">＋</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setRipple(!ripple)}
            accessibilityRole="button"
            accessibilityLabel={t.scenes.ripple}
            accessibilityState={{ selected: ripple }}
            className="flex-row items-center justify-between rounded-xl bg-surface-raised px-4 py-3 active:opacity-80"
          >
            <Text className="flex-1 text-sm text-fg">{t.scenes.ripple}</Text>
            <Text className="text-sm font-semibold text-accent-soft">
              {ripple ? t.common.on : t.common.off}
            </Text>
          </Pressable>
          <Text className="text-xs leading-5 text-fg-muted">
            {t.scenes.rippleNote(scene.timeSeconds.toFixed(1))}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => void handleDelete()}
        accessibilityRole="button"
        className="self-start rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
      >
        <Text className="text-sm text-fg">
          {isConfirmingDelete
            ? t.scenes.removeConfirm(scene.name, dancerCount)
            : t.scenes.remove}
        </Text>
      </Pressable>
    </View>
  );
}
