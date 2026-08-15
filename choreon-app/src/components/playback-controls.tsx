import { Pressable, Text, View } from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useCountIn } from '@/features/music/hooks/useCountIn';
import { useMetronome } from '@/features/music/hooks/useMetronome';
import { useMusicPlayback } from '@/features/music/hooks/useMusicPlayback';
import { useSilentClock } from '@/features/music/hooks/useSilentClock';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
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
  const t = useT();
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

  // 速さは【作品】が持つ。曲を入れていなくても、この速さで拍を鳴らす
  const bpm = useProjectStore((state) => state.project?.bpm ?? 120);
  const beatsPerBar = useProjectStore((state) => state.project?.beatsPerBar ?? 4);
  const musicOffsetSeconds = useProjectStore(
    (state) => state.project?.musicOffsetSeconds ?? 0,
  );
  const countIn = useSettingsStore((state) => state.countIn);
  const isMetronomeEnabled = useUIStore((state) => state.isMetronomeEnabled);

  const {
    isCountingIn,
    remainingBeats,
    start: startCountIn,
    cancel: cancelCountIn,
  } = useCountIn(bpm);

  // 数えている間も拍は鳴る（そのための予備拍なので）
  useMetronome({
    isActive: isMetronomeEnabled && (isPlaying || isCountingIn),
    bpm,
    beatsPerBar,
    originSeconds: musicOffsetSeconds,
  });

  const toggle = () => {
    if (isCountingIn) {
      // 数えている最中にもう一度押したら、始める前に取り消す
      cancelCountIn();
      return;
    }

    if (!isPlaying) {
      const from = playbackStartIndex(scenes, selectedSceneId, playbackStartSceneId);
      if (from === -1) return;

      if (scenes[from].id !== selectedSceneId) selectScene(scenes[from].id);
      setPlaybackStartScene(scenes[from].id);
      setCurrentTime(sceneStartSeconds(scenes)[from] ?? 0);

      // 予備拍。0 ならその場で始まる（`useCountIn` が判断する）
      startCountIn(countIn, () => setIsPlaying(true));
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
    cancelCountIn();
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
        accessibilityLabel={
          isCountingIn ? t.playback.countingIn(remainingBeats) : isPlaying ? t.playback.stop : t.playback.play
        }
        className={`flex-1 items-center rounded-xl bg-accent py-3 active:opacity-80 ${
          scenes.length === 0 ? 'opacity-35' : ''
        }`}
      >
        <Text className="text-base font-semibold text-accent-fg">
          {/* 数えている間は残りの拍を出す。押した手応えがここに出ないと、
              予備拍を待っているのか押せていないのか分からない */}
          {isCountingIn
            ? t.playback.countingIn(remainingBeats)
            : isPlaying
              ? t.playback.stop
              : t.playback.play}
        </Text>
      </Pressable>

      <Pressable
        onPress={rewind}
        accessibilityRole="button"
        accessibilityLabel={t.playback.rewind}
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
