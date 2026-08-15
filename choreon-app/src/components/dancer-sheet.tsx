import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DANCER_COLOR_PALETTE } from '@/features/dancer/constants';
import {
  findFreePositions,
  nextDancerNames,
  pickDancerColors,
} from '@/features/dancer/lib/newDancers';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { createDancers, deleteDancer, updateDancerColor } from '@/features/dancer/api/dancers';
import { upsertPositions } from '@/features/scene/api/positions';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';
import { randomId } from '@/lib/randomId';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * ダンサーの出し入れ。足す・色を変える・消す。
 *
 * ■ 名前・色・置き場所は Web版の関数がそのまま決める
 * `newDancers.ts`（続き番号・使われていない色・空いているマス）をテストごと
 * コピーして使っている。**同じ作品を Web とスマホの両方で触ったときに、
 * 増えかたが違うと混乱する**ため。
 *
 * ■ 足した人は【全シーン】に置く
 * ダンサーは作品に属し、シーンごとに立ち位置を持つ。開いているシーンにだけ
 * 座標を作ると、別のシーンへ移った瞬間その人だけ消える（座標が無い＝描かれ
 * ない）。Web版 AddDancerSheet が同じ理由で全シーンぶん作っている。
 *
 * ■ 色を変えるのに専用の口を作らない
 * ストアには `addDancer` しかない（上書きも兼ねている）。Web版の
 * DancerInspector も `addDancer({ ...dancer, color })` で色を変えているので、
 * ここも同じ形にした。**ストアをネイティブ側だけ増やさない**ための判断。
 *
 * ■ 消すのは2タップ
 * `Alert.alert` は Web（react-native-web）では何も出ないので、確認は画面の中に
 * 出す。1タップ目で「本当に消す」に変わる。
 *
 * ■ 保存
 * 追加・色替え・削除はすべて `persist` を通す（ゲスト中や仮のサンプルでは
 * 何も書かない）。**消すのは保存できてから**で、足すのは先に画面へ出して
 * 失敗したら取り消す。消す方を逆にすると、失敗したときにその人の立ち位置を
 * 全シーンぶん画面へ戻す羽目になる。
 */
export function DancerSheet({ stageWidthUnits, stageHeightUnits }: Props) {
  const t = useT();
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const projectId = useProjectStore((state) => state.project?.id);
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);

  // 見せる色はテーマ側の6色。**選び方の判定は保存されている値のまま**
  // 行う（読み替えた色で照合すると、紙のテーマで全部が「選択中」に見える）
  const theme = useCurrentTheme();

  const list = Object.values(dancers);
  const selected = selectedDancerId ? dancers[selectedDancerId] : undefined;

  const handleAdd = async () => {
    const sceneId = selectedSceneId ?? scenes[0]?.id;
    if (!sceneId) return;

    const [name] = nextDancerNames(
      list.map((dancer) => dancer.name),
      1,
    );
    const [color] = pickDancerColors(
      list.map((dancer) => dancer.color),
      1,
      DANCER_COLOR_PALETTE,
    );
    const [spot] = findFreePositions(
      Object.values(positionsBySceneId[sceneId] ?? {}),
      1,
      stageWidthUnits,
      stageHeightUnits,
    );

    const id = randomId();
    const created = {
      id,
      projectId: projectId ?? 'local',
      name,
      color,
      // 0度 = 客席を向く（Web版と同じ既定）
      initialDirection: 0,
      createdAt: new Date().toISOString(),
    };
    addDancer(created);

    // 全シーンに同じ場所で立たせる。「まだ動かしていない人」から始まり、
    // 動かしたシーンだけが変わっていく
    const placed = scenes.map((scene) => ({
      sceneId: scene.id,
      dancerId: id,
      xCoordinate: spot.x,
      yCoordinate: spot.y,
      rotationAngle: 0,
    }));
    for (const position of placed) {
      updateDancerPosition(position.sceneId, id, position);
    }
    selectDancer(id);

    try {
      // ダンサーを作ってから立ち位置（外部キーの順番）
      await persist(async (client) => {
        await createDancers(client, [created]);
        await upsertPositions(client, placed);
      });
    } catch {
      removeDancer(id);
      selectDancer(null);
      showToast({ message: t.dancers.addFailed, type: 'error' });
    }
  };

  const handleSelect = (dancerId: string) => {
    selectDancer(dancerId === selectedDancerId ? null : dancerId);
  };

  /**
   * 消す。確認は共通のダイアログに任せる（`requestConfirm`）。
   *
   * 以前は2回押しだった。**その人が全シーンから消えることが伝わらない** —
   * ダイアログなら「N シーンぶんの立ち位置」を数で示せる。
   */
  const handleDelete = (dancerId: string) => {
    const dancer = dancers[dancerId];
    if (!dancer) return;

    requestConfirm({
      title: t.dancers.removeTitle(dancer.name),
      description: t.dancers.removeDescription,
      meta: [t.dancers.removeMetaScenes(scenes.length)],
      onConfirm: async () => {
        // 消すのは【保存できてから】。先に消して失敗すると、その人の
        // 立ち位置（全シーンぶん）まで画面へ戻す必要が出る
        try {
          await persist((client) => deleteDancer(client, dancerId));
        } catch {
          showToast({ message: t.dancers.removeFailed, type: 'error' });
          return;
        }
        removeDancer(dancerId);
        selectDancer(null);
      },
    });
  };

  /** 色を変える。ストアの addDancer が上書きも兼ねる（Web版と同じ） */
  const changeColor = async (dancerId: string, color: string) => {
    const before = dancers[dancerId];
    if (!before || before.color === color) return;

    addDancer({ ...before, color });
    try {
      await persist((client) => updateDancerColor(client, dancerId, color));
    } catch {
      addDancer(before);
      showToast({ message: t.dancers.colorFailed, type: 'error' });
    }
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-widest text-fg-muted">
          {t.dancers.section(list.length)}
        </Text>
        <Pressable
          onPress={() => void handleAdd()}
          accessibilityRole="button"
          accessibilityLabel={t.dancers.addLabel}
          className="rounded-full bg-accent px-4 py-1.5 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-accent-fg">{t.dancers.add}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-2"
      >
        {list.map((dancer) => {
          const isSelected = dancer.id === selectedDancerId;
          return (
            <Pressable
              key={dancer.id}
              onPress={() => handleSelect(dancer.id)}
              accessibilityRole="button"
              accessibilityLabel={dancer.name}
              className={`flex-row items-center gap-2 rounded-xl px-3 py-2 active:opacity-80 ${
                isSelected
                  ? 'border border-accent bg-accent-row'
                  : 'border border-line bg-surface-raised'
              }`}
            >
              <View
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: themedDancerColor(dancer.color, theme) }}
              />
              <Text className="text-sm text-fg-strong">{dancer.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <View className="gap-3 rounded-xl bg-surface-raised p-3">
          <Text className="text-xs text-fg-muted">
            {t.dancers.selected} <Text className="text-fg-strong">{selected.name}</Text>
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {DANCER_COLOR_PALETTE.map((color) => (
              <Pressable
                key={color}
                onPress={() => void changeColor(selected.id, color)}
                accessibilityRole="button"
                accessibilityLabel={t.dancers.colorLabel(color)}
                className={`h-9 w-9 rounded-full ${
                  selected.color === color ? 'border-2 border-fg-strong' : 'border border-line'
                }`}
                style={{ backgroundColor: themedDancerColor(color, theme) }}
              />
            ))}
          </View>

          <Pressable
            onPress={() => handleDelete(selected.id)}
            accessibilityRole="button"
            className="self-start rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-sm text-fg">{t.dancers.remove}</Text>
          </Pressable>
        </View>
      ) : (
        <Text className="text-xs leading-5 text-fg-muted">
          {t.dancers.hint}
        </Text>
      )}
    </View>
  );
}
