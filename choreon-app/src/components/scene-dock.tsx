import { Pressable, ScrollView, Text, View } from 'react-native';

import { SceneThumbnail } from '@/components/scene-thumbnail';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useAddScene } from '@/features/scene/hooks/useAddScene';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useTourTarget } from '@/features/tutorial/lib/tourTargets';
import { useT } from '@/features/i18n/store/useLocaleStore';

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
type Props = {
  /**
   * 「直す」を押したとき。シーンの名前・時刻・削除はシートへ移したので、
   * ここがその入口になる（渡さなければボタンは出ない）。
   *
   * 選んでいるカードをもう一度押す、という形にはしなかった。
   * **押せるものが2つの意味を持つと、どちらが起きるか押すまで分からない。**
   */
  onEditScene?: () => void;
  /** ステージの広さ。カードのミニチュアを同じ形で描くために要る */
  stageWidthUnits: number;
  stageHeightUnits: number;
  /**
   * 読むだけの画面か。**足す「＋」を出さない。**
   *
   * 共有されたものを開いた人は、相手の作品を触れない（`persist` が
   * 何も送らない）。それでも押せる形で置いてあると、押した人は
   * 「足したのに保存されない」と受け取る。
   */
  isReadOnly?: boolean;
};

/** カードの中のミニチュアの幅（px）。Web版のストリップは74px */
const THUMBNAIL_WIDTH = 74;

export function SceneDock({
  onEditScene,
  stageWidthUnits,
  stageHeightUnits,
  isReadOnly = false,
}: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  // 足す処理は一覧（広い画面）と共通。フックへ切り出してある
  const handleAdd = useAddScene();
  // 使い方の案内が指す先。曲があるときは MusicTimeline の "timeline" に
  // 差し替わる。**別の名前**にしてあるのは、説明する中身が違うため
  // （こちらは等間隔の帯、あちらは曲の時間軸）
  const timelineRef = useTourTarget('scene-dock');
  const addRef = useTourTarget('add-scene');

  return (
    <View ref={timelineRef} className="gap-2 rounded-2xl border border-line bg-surface p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-widest text-fg-muted">{t.scenes.section}</Text>
        {onEditScene ? (
          <Pressable
            onPress={onEditScene}
            accessibilityRole="button"
            accessibilityLabel={t.editor.editScene}
            className="-my-1 rounded-lg px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs text-accent-soft">{t.editor.editScene}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <Pressable
              key={scene.id}
              onPress={() => selectScene(scene.id)}
              accessibilityRole="button"
              accessibilityLabel={scene.name}
              accessibilityState={{ selected: isSelected }}
              className={`gap-1 rounded-xl p-2 active:opacity-80 ${
                isSelected ? 'border-2 border-accent bg-accent-row' : 'border border-line bg-surface-raised'
              }`}
            >
              {/* 隊形のミニチュア。番号と名前だけだと、探しているシーンが
                  どれかは名前を付けた人にしか分からない */}
              <SceneThumbnail
                sceneId={scene.id}
                stageWidthUnits={stageWidthUnits}
                stageHeightUnits={stageHeightUnits}
                widthPx={THUMBNAIL_WIDTH}
              />
              <View style={{ width: THUMBNAIL_WIDTH }}>
                <View className="flex-row items-baseline justify-between gap-1">
                  <Text
                    numberOfLines={1}
                    className={`min-w-0 flex-1 text-xs ${
                      isSelected ? 'font-semibold text-accent-soft' : 'text-fg-sub'
                    }`}
                  >
                    {scene.name}
                  </Text>
                  <Text
                    className={`shrink-0 font-mono text-[10px] ${
                      isSelected ? 'font-semibold text-accent-soft' : 'text-fg-muted'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text className="font-mono text-[10px] text-fg-muted">
                  {scene.timeSeconds.toFixed(1)}s
                </Text>
              </View>
            </Pressable>
          );
        })}

        {isReadOnly ? null : (
        <Pressable
          ref={addRef}
          onPress={() => void handleAdd()}
          accessibilityRole="button"
          accessibilityLabel={t.scenes.add}
          className="min-w-14 items-center justify-center rounded-xl border border-dashed border-line-strong px-3 active:opacity-80"
        >
          <Text className="text-lg text-fg-sub">＋</Text>
        </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
