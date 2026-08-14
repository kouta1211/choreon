import { Pressable, Text, View } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useMusicPlayback } from '@/features/music/hooks/useMusicPlayback';
import { useSilentClock } from '@/features/music/hooks/useSilentClock';
import {
  nearestSceneIndexAtSeconds,
  sceneStartSeconds,
} from '@/features/music/lib/musicTimeline';
import { playbackStartIndex } from '@/features/music/lib/playbackStart';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';

/**
 * 通し再生。**まだ曲は鳴らない**（時計だけ）。
 *
 * ■ どこから流すか・どこで止めるか は Web版の関数がそのまま決める
 * `playbackStart.ts`（最後まで流し終えた状態で押されたら、前回始めた場所へ
 * 戻る）と `musicTimeline.ts`（止めるときはいちばん近いシーンへ寄せる）を
 * コピーして呼んでいる。**押し心地が Web とスマホでずれない**ようにするため。
 *
 * ■ 止めるときにシーンへ寄せる理由
 * 押した瞬間の時刻はたいてい区間の途中で、そこで止めると「シーン2と3の
 * あいだ」という、隊形としては存在しない状態で残る（Web版 usePlaybackToggle
 * と同じ）。
 *
 * ■ 時計は2つあって、動くのは片方だけ
 * 曲があれば音の再生位置（`useMusicPlayback`）、無ければ秒を数える
 * （`useSilentClock`）。**どちらも同じ場所へ秒を書く**ので、ここから下は
 * 曲の有無を知らなくてよい。
 *
 * ■ まだ無いもの
 * メトロノームと予備拍（カウントイン）。どちらも「拍を鳴らす」仕組みが
 * 別に要る（曲を鳴らすのとは別の音源）。
 */
export function PlaybackControls() {
  // 時計はここで回す（再生中だけ動く）。曲があれば曲が時計、無ければ秒を数える。
  // どちらも同じ場所（usePlaybackStore）へ書くので、下の表示は変わらない
  useSilentClock();
  useMusicPlayback();

  const scenes = useProjectStore((state) => state.scenes);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const playbackStartSceneId = useUIStore((state) => state.playbackStartSceneId);
  const setPlaybackStartScene = useUIStore((state) => state.setPlaybackStartScene);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);

  const toggle = () => {
    if (!isPlaying) {
      const from = playbackStartIndex(scenes, selectedSceneId, playbackStartSceneId);
      if (from === -1) return;

      if (scenes[from].id !== selectedSceneId) selectScene(scenes[from].id);
      setPlaybackStartScene(scenes[from].id);
      setCurrentTime(sceneStartSeconds(scenes)[from] ?? 0);
      setIsPlaying(true);
      return;
    }

    // 止めるときは、いちばん近いシーンへ寄せてから止める
    const index = nearestSceneIndexAtSeconds(scenes, currentTime);
    const scene = scenes[index];
    if (scene) {
      selectScene(scene.id);
      setCurrentTime(sceneStartSeconds(scenes)[index] ?? 0);
    }
    setIsPlaying(false);
  };

  const rewind = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (scenes[0]) selectScene(scenes[0].id);
  };

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={toggle}
        disabled={scenes.length === 0}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? '止める' : '通しで見る'}
        className={`flex-1 items-center rounded-xl bg-accent py-3 active:opacity-80 ${
          scenes.length === 0 ? 'opacity-35' : ''
        }`}
      >
        <Text className="text-base font-semibold text-accent-fg">
          {isPlaying ? '■ 止める' : '▶ 通しで見る'}
        </Text>
      </Pressable>

      <Pressable
        onPress={rewind}
        accessibilityRole="button"
        accessibilityLabel="頭に戻す"
        className="rounded-xl border border-line-strong px-4 py-3 active:opacity-80"
      >
        <Text className="text-base text-fg">⏮</Text>
      </Pressable>

      <Text className="w-16 text-right font-mono text-sm text-fg-muted">
        {currentTime.toFixed(1)}s
      </Text>
    </View>
  );
}
