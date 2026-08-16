import { Pressable, ScrollView, Text, View } from 'react-native';

import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { sceneSpanAt } from '@/features/viewer/lib/interpolate';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { moveText } from '@/features/i18n/lib/moveText';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { describeMove } from '@/features/viewer/lib/describeMove';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

type Props = {
  /** 見る人が選んだポジション。null なら全員を見ている（道順は出さない） */
  focusedDancerId: string | null;
  onReselect: () => void;
};

/**
 * 選んだ人の道順を、シーンごとに1行ずつ言葉で出す。
 *
 * ■ 座標を読ませない
 * 稽古場で見るのは「(3.0, 6.0) から (7.0, 2.0) へ」ではなく
 * **「下手前へ 約6歩」**。数字を差分に直して読み替えるのは、その場で
 * やるには手間が多すぎる（Web版 describeMove のコメントと同じ理由）。
 *
 * ■ 上手／下手は【客席から見た向き】
 * 画面は真上から、客席を下にして見ている。客席から舞台を見ると左右が
 * 入れ替わるので、**画面の左が下手**。変換は `describeMove` の1箇所だけ。
 *
 * ■ 文にするのは辞書の仕事
 * `describeMove` は「左へ・前へ・6歩」という部品までしか出さない。
 * 語順は言語で変わり、英語には「下手前」に当たる1語が無い（`moveText`）。
 *
 * ■ 押すとそのシーンへ飛ぶ
 * 読みながら「ここはどんな形だったか」を確かめられる。いま見ているシーンの
 * 行には印を付ける。
 */
export function ViewerRoute({ focusedDancerId, onReselect }: Props) {
  const t = useT();
  const theme = useCurrentTheme();

  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  /* この画面が持つのは「いま何番のシーン」ではなく **「いま何秒目」**。
     スクラブ帯で区間の途中に止まれるので、シーンを選ぶ形だとその状態を
     表せない（`interpolate.ts` のコメントと同じ理由）。
     押したときも秒を動かす — シーンを選ぶとステージが付いてこない */
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const spanNow = sceneSpanAt(scenes, currentTime);

  const dancer = focusedDancerId ? dancers[focusedDancerId] : undefined;
  const total = scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;

  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-fg-strong">
          {dancer ? t.viewer.route.title(dancer.name) : t.viewer.route.everyone}
        </Text>
        <Pressable
          onPress={onReselect}
          accessibilityRole="button"
          accessibilityLabel={t.viewer.route.reselect}
          className="rounded-lg px-2 py-1 active:opacity-70"
        >
          <Text className="text-xs text-accent-soft">{t.viewer.route.reselect}</Text>
        </Pressable>
      </View>

      <Text className="font-mono text-[10px] text-fg-muted">
        {t.viewer.route.summary(scenes.length, `${total.toFixed(1)}s`)}
      </Text>

      {dancer ? (
        <ScrollView className="max-h-56" showsVerticalScrollIndicator={false}>
          <View className="gap-1">
            {scenes.map((scene, index) => {
              const here = positionsBySceneId[scene.id]?.[dancer.id];
              const previous =
                index === 0 ? undefined : positionsBySceneId[scenes[index - 1].id]?.[dancer.id];
              const isCurrent = scene.id === spanNow?.from.id;

              // 先頭のシーンには「入ってくる動き」が無い。立ち位置だけを出す
              const description =
                previous && here
                  ? describeMove(previous, here, scene.timeSeconds - scenes[index - 1].timeSeconds)
                  : null;
              const line = description ? moveText(description, t) : null;

              return (
                <Pressable
                  key={scene.id}
                  onPress={() => setCurrentTime(scene.timeSeconds)}
                  accessibilityRole="button"
                  accessibilityLabel={scene.name}
                  className={`flex-row items-baseline gap-2 rounded-lg px-2 py-1.5 active:opacity-70 ${
                    isCurrent ? 'bg-accent-row' : ''
                  }`}
                >
                  <Text className="w-10 shrink-0 font-mono text-[10px] text-fg-muted">
                    {scene.timeSeconds.toFixed(1)}s
                  </Text>
                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-sm ${isCurrent ? 'text-accent-soft' : 'text-fg-strong'}`}
                    >
                      {line ? line.text : scene.name}
                      {/* 歩いて間に合わない速さは、その場で添える */}
                      {description?.isFast ? (
                        <Text className="text-[#f59e0b]">{t.viewer.route.fast}</Text>
                      ) : null}
                      {isCurrent ? (
                        <Text className="text-fg-muted">{t.viewer.route.hereNow}</Text>
                      ) : null}
                    </Text>
                    {line?.turn ? (
                      <Text className="text-[10px] text-fg-sub">{line.turn}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            <Text className="px-2 pt-1 text-[10px] text-fg-muted">
              {t.viewer.route.lastFormation}
            </Text>
          </View>
        </ScrollView>
      ) : null}

      <Text className="text-[10px] leading-4 text-fg-muted">
        {t.viewer.route.stepsNote} {t.viewer.route.sidesNote}
      </Text>

      {dancer ? (
        <View className="flex-row items-center gap-2">
          <View
            style={{ backgroundColor: themedDancerColor(dancer.color, theme) }}
            className="h-3 w-3 rounded-full"
          />
          <Text className="text-[10px] text-fg-muted">{dancer.name}</Text>
        </View>
      ) : null}
    </View>
  );
}
