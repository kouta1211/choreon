import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { DANCER_COLOR_PALETTE } from '@/features/dancer/constants';
import { deleteDancer, updateDancerColor, updateDancerName } from '@/features/dancer/api/dancers';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { upsertPositions } from '@/features/scene/api/positions';
import { sceneDurations } from '@/features/scene/lib/sceneTiming';
import { resolveNumberInput } from '@/features/settings/lib/numberField';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

/** 個別の移動時間が取れる範囲。Web版と同じ（schema.sql の CHECK に合わせてある） */
const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 30;

/**
 * 選んでいる人の操作。**ステージの直上に浮かせる帯**（Web版 DancerInspector）。
 *
 * ■ なぜ浮かせるのか
 * 普通に並べると、ダンサーを選ぶたびにステージが縮んで全員の位置がずれて
 * 見える（選んだ瞬間に画面が揺れる）。高さを取らなければステージは動かない。
 *
 * ■ シートを開かずに済ませる
 * これまで色替えと削除は「ダンサー」のシートの中だけにあった。
 * ステージで人を選んでからシートを開き直す、という手数がかかっていた。
 *
 * ■ 地にその人の色を流す
 * 左端に色帯を置き、面をその人の色でうっすら染める。誰の設定をいじって
 * いるのかを、名前を読まなくても地の色で分かるようにするため。
 *
 * ■「注目」と「この人だけの移動時間」はここが初めての入口
 * どちらも型とストアには前からあったが、**触れる場所が無かった**
 * （`focusedDancerId` / `dancerTransitionDurationSeconds`）。
 * ステージ側もこのコミットで対応させてある（注目＝他を薄く、
 * 個別の時間＝その人だけ早く着く）。
 */
export function DancerInspector() {
  const t = useT();
  const theme = useCurrentTheme();
  const accent = useThemeColor('--accent');

  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const setFocusedDancer = useUIStore((state) => state.setFocusedDancer);

  const dancer = useProjectStore((state) =>
    selectedDancerId ? state.dancers[selectedDancerId] : undefined,
  );
  const scenes = useProjectStore((state) => state.scenes);
  const position = useProjectStore((state) =>
    selectedSceneId && selectedDancerId
      ? state.positionsBySceneId[selectedSceneId]?.[selectedDancerId]
      : undefined,
  );
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);

  // 打っている間の文字列。**選び直したら入れ替える** — 前の人の名前が
  // 残っていると、続けて打った文字が別の人へ入る（scene-editor と同じ話）
  const [nameDraft, setNameDraft] = useState(dancer?.name ?? '');
  const [lastDancerId, setLastDancerId] = useState(selectedDancerId);
  if (selectedDancerId !== lastDancerId) {
    setLastDancerId(selectedDancerId);
    setNameDraft(dancer?.name ?? '');
  }

  const [durationDraft, setDurationDraft] = useState('');
  const [lastKey, setLastKey] = useState('');
  const key = `${selectedDancerId}-${selectedSceneId}`;
  if (key !== lastKey) {
    setLastKey(key);
    setDurationDraft(
      position?.dancerTransitionDurationSeconds != null
        ? String(position.dancerTransitionDurationSeconds)
        : '',
    );
  }

  if (!dancer) return null;

  const color = themedDancerColor(dancer.color, theme);
  const isFocused = focusedDancerId === dancer.id;

  // このシーンへ入ってくる区間の長さ。空欄のときの目安として薄く出す
  const segmentSeconds =
    sceneDurations(scenes)[scenes.findIndex((scene) => scene.id === selectedSceneId)] ?? 1;

  const commitName = async () => {
    const next = nameDraft.trim();
    if (!next || next === dancer.name) {
      setNameDraft(dancer.name);
      return;
    }
    const previous = dancer;
    addDancer({ ...previous, name: next });
    try {
      await persist((client) => updateDancerName(client, previous.id, next));
    } catch {
      addDancer(previous);
      setNameDraft(previous.name);
      showToast({ message: t.dancers.inspector.nameFailed, type: 'error' });
    }
  };

  const changeColor = async (next: string) => {
    if (dancer.color === next) return;
    const previous = dancer;
    addDancer({ ...previous, color: next });
    try {
      await persist((client) => updateDancerColor(client, previous.id, next));
    } catch {
      addDancer(previous);
      showToast({ message: t.dancers.colorFailed, type: 'error' });
    }
  };

  /** この人・このシーンだけの移動時間。空欄＝区間いっぱいを使う */
  const commitDuration = async () => {
    if (!selectedSceneId || !position) return;

    const trimmed = durationDraft.trim();
    const next =
      trimmed === ''
        ? null
        : resolveNumberInput(trimmed, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS);

    // 数として読めないものは前の値に戻すだけ（空欄は「解除」なので通す）
    if (trimmed !== '' && next === null) {
      setDurationDraft(
        position.dancerTransitionDurationSeconds != null
          ? String(position.dancerTransitionDurationSeconds)
          : '',
      );
      return;
    }
    setDurationDraft(next === null ? '' : String(next));

    const before = position.dancerTransitionDurationSeconds ?? null;
    if (next === before) return;

    updateDancerPosition(selectedSceneId, dancer.id, {
      dancerTransitionDurationSeconds: next,
    });
    try {
      await persist((client) =>
        upsertPositions(client, [
          { ...position, dancerTransitionDurationSeconds: next },
        ]),
      );
    } catch {
      updateDancerPosition(selectedSceneId, dancer.id, {
        dancerTransitionDurationSeconds: before,
      });
      setDurationDraft(before === null ? '' : String(before));
      showToast({ message: t.dancers.inspector.ownDurationFailed, type: 'error' });
    }
  };

  const handleDelete = () => {
    // 何シーンぶんの立ち位置を持っているかを数えて見せる。ストアの中身を
    // 数えるだけなので、確認のための問い合わせは要らない
    const sceneCount = Object.values(
      useProjectStore.getState().positionsBySceneId,
    ).filter((positions) => positions[dancer.id] !== undefined).length;

    requestConfirm({
      title: t.dancers.removeTitle(dancer.name),
      description: t.dancers.removeDescription,
      meta: [t.dancers.removeMetaScenes(sceneCount)],
      onConfirm: async () => {
        try {
          await persist((client) => deleteDancer(client, dancer.id));
        } catch {
          showToast({ message: t.dancers.removeFailed, type: 'error' });
          return;
        }
        removeDancer(dancer.id);
        selectDancer(null);
        if (focusedDancerId === dancer.id) setFocusedDancer(null);
      },
    });
  };

  return (
    <View
      // ドックの直上に浮かせる。`bottom-full` で、この帯の下辺が
      // 親（＝下端の帯を囲む View）の上辺に来る
      className="absolute inset-x-3 bottom-full mb-2 flex-row overflow-hidden rounded-xl border border-line bg-surface"
    >
      {/* 誰の設定かを地の色で示す */}
      <View style={{ backgroundColor: color }} className="w-1 shrink-0" />

      <View className="min-w-0 flex-1 gap-2 px-2.5 py-2">
        <View className="flex-row items-center gap-1">
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={() => void commitName()}
            onSubmitEditing={() => void commitName()}
            returnKeyType="done"
            accessibilityLabel={t.dancers.inspector.name}
            selectionColor={accent}
            className="min-w-0 flex-1 text-base font-semibold text-fg-strong"
          />

          <Pressable
            onPress={() => setFocusedDancer(isFocused ? null : dancer.id)}
            accessibilityRole="button"
            // 注目中は押すと【解除】になる。同じ読み上げのままだと、
            // 目で色を見られない人には、いまどちらの状態なのかが分からない
            accessibilityLabel={
              isFocused ? t.dancers.inspector.focusOn : t.dancers.inspector.focus
            }
            accessibilityState={{ selected: isFocused }}
            aria-selected={isFocused}
            className={`h-9 w-9 items-center justify-center rounded-lg active:opacity-70 ${
              isFocused ? 'bg-accent-row' : ''
            }`}
          >
            <Icon name="focus" size={17} tone={isFocused ? '--accent-soft' : '--text-muted'} />
          </Pressable>

          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={t.dancers.remove}
            className="h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
          >
            <Icon name="trash" size={17} tone="--dancer-2" />
          </Pressable>

          <Pressable
            onPress={() => selectDancer(null)}
            accessibilityRole="button"
            accessibilityLabel={t.dancers.inspector.deselect}
            className="h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
          >
            <Icon name="close" size={17} />
          </Pressable>
        </View>

        <View className="flex-row flex-wrap items-center gap-1.5">
          {DANCER_COLOR_PALETTE.map((swatch) => (
            <Pressable
              key={swatch}
              onPress={() => void changeColor(swatch)}
              accessibilityRole="button"
              accessibilityLabel={t.dancers.colorLabel(swatch)}
              className={`h-7 w-7 rounded-full ${
                dancer.color === swatch ? 'border-2 border-fg-strong' : 'border border-line'
              }`}
              style={{ backgroundColor: themedDancerColor(swatch, theme) }}
            />
          ))}

          {/* この人だけの移動時間。空欄なら区間いっぱい（薄く目安を出す） */}
          {selectedSceneId && position ? (
            <View className="ml-auto flex-row items-center gap-1 rounded-lg bg-surface-raised px-2 py-1">
              <TextInput
                value={durationDraft}
                onChangeText={setDurationDraft}
                onBlur={() => void commitDuration()}
                onSubmitEditing={() => void commitDuration()}
                keyboardType="decimal-pad"
                returnKeyType="done"
                placeholder={t.dancers.inspector.inherit(segmentSeconds.toFixed(1))}
                accessibilityLabel={t.dancers.inspector.ownDuration}
                selectionColor={accent}
                className="w-10 text-right font-mono text-sm text-fg"
              />
              <Text className="text-xs text-fg-muted">{t.dancers.inspector.seconds}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
