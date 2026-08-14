import { Pressable, ScrollView, Text, View } from 'react-native';

import { SceneThumbnail } from '@/components/scene-thumbnail';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useAddScene } from '@/features/scene/hooks/useAddScene';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** カードを押したあと。広い画面ではシートを開かないので任意 */
  onEditScene?: () => void;
};

/** 縦に並べるときのミニチュアの幅（px）。Web版のサイドバーは64px */
const THUMBNAIL_WIDTH = 64;

/**
 * シーンの縦一覧。**広い画面（横のパネル）でだけ使う。**
 *
 * 狭い画面の帯（SceneDock）と役割は同じで、並べる向きだけが違う。
 * 横に流す帯は3〜4枚しか見えないが、縦なら10枚以上が一度に見える。
 * タブレットで振付を通して見るときは、こちらの方が全体を掴みやすい。
 *
 * 足す処理は帯と共通（`useAddScene`）。**時刻の決め方が2箇所にあると、
 * どちらから足したかで並びが変わる。**
 */
export function SceneList({ stageWidthUnits, stageHeightUnits, onEditScene }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const handleAdd = useAddScene();

  return (
    <View className="min-h-0 flex-1">
      {/* 見出しは出さない。この一覧を置いているタブが既に「シーン」と
          名乗っていて、同じ言葉が縦に2つ並ぶ */}
      {onEditScene ? (
        <View className="flex-row justify-end px-3 pt-2">
          <Pressable
            onPress={onEditScene}
            accessibilityRole="button"
            accessibilityLabel={t.editor.editScene}
            className="rounded-lg px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs text-accent-soft">{t.editor.editScene}</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        className="min-h-0 flex-1"
        contentContainerClassName="gap-2 px-3 pb-3"
        showsVerticalScrollIndicator={false}
      >
        {scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <Pressable
              key={scene.id}
              onPress={() => selectScene(scene.id)}
              accessibilityRole="button"
              accessibilityLabel={scene.name}
              accessibilityState={{ selected: isSelected }}
              className={`flex-row items-center gap-2.5 rounded-xl p-2 active:opacity-80 ${
                isSelected
                  ? 'border-2 border-accent bg-accent-row'
                  : 'border border-line bg-surface-raised'
              }`}
            >
              <SceneThumbnail
                sceneId={scene.id}
                stageWidthUnits={stageWidthUnits}
                stageHeightUnits={stageHeightUnits}
                widthPx={THUMBNAIL_WIDTH}
              />
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className={`text-sm ${isSelected ? 'font-semibold text-accent-soft' : 'text-fg-strong'}`}
                >
                  {scene.name}
                </Text>
                <Text className="font-mono text-[10px] text-fg-muted">
                  {String(index + 1).padStart(2, '0')} · {scene.timeSeconds.toFixed(1)}s
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => void handleAdd()}
          accessibilityRole="button"
          accessibilityLabel={t.scenes.add}
          className="min-h-11 items-center justify-center rounded-xl border border-dashed border-line-strong active:opacity-80"
        >
          <Text className="text-lg text-fg-sub">＋</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
