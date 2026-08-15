import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

import { isDownbeat, secondsPerBeat } from '@/features/music/lib/metronome';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';

type Params = {
  /** 鳴らすかどうか。再生中かつメトロノームONのときだけ true */
  isActive: boolean;
  bpm: number;
  /** 何拍ごとに高い音にするか。作品の拍子（projects.beats_per_bar） */
  beatsPerBar?: number;
  /** 1拍目がいつか。曲の頭出し位置を渡すと、イントロを飛ばして数え始める */
  originSeconds?: number;
};

/** 拍を取りこぼさない見張りの間隔（ms）。拍の間隔よりずっと短くする */
const TICK_MS = 20;

/**
 * メトロノーム。**Web版とは鳴らし方が根本的に違う。**
 *
 * ■ Web版は「予約」、こちらは「見張り」
 * あちらは Web Audio API の時計へ拍を先読みで予約している。予約さえ
 * 入っていればオーディオ側の正確な時計が鳴らすので、JS が詰まってもずれない。
 * **React Native に Web Audio API は無い**（`AudioContext` が存在しない）。
 * expo-audio は「用意した音を今から鳴らす」ことしかできず、先の時刻を
 * 予約できない。
 *
 * そこで、短い間隔で時計を見に行き、**通り過ぎた拍があればその場で鳴らす**。
 * 拍の時刻そのものは Web版と同じ `metronome.ts` が決めるので、
 * **ずれは溜まらない**（次の拍は常に絶対時刻から計算する）。ただし
 * 1拍ごとの鳴り出しは見張りの間隔ぶん遅れうる。
 *
 * ■ 実機で聴いてもらう必要がある
 * この作りは**拍が揺れるかもしれない**。揺れが気になるようなら、
 * Web Audio API を持つ `react-native-audio-api` を入れて予約式へ寄せる。
 * ここを直すときは、拍の計算（metronome.ts）はそのまま使える。
 *
 * ■ 時計は再生と同じものを使う
 * 曲があれば音の再生位置、無ければ秒を数える時計（どちらも
 * `usePlaybackStore.currentTime` に書かれる）。**別に時計を持つと、
 * 隊形と拍が別々にずれていく。**
 */
export function useMetronome({
  isActive,
  bpm,
  beatsPerBar = 4,
  originSeconds = 0,
}: Params) {
  // 2つ用意するのは、小節の頭だけ高い音にするため。
  // 1つを鳴らし分けることはできない（用意した音がそのまま出る）
  const downbeat = useAudioPlayer(require('../../../../assets/click-downbeat.wav'));
  const beat = useAudioPlayer(require('../../../../assets/click-beat.wav'));

  /** 最後に鳴らした拍の番号。**同じ拍を二度鳴らさないための印** */
  const lastBeatIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      // 止めたら番号を捨てる。次に再生したとき、その場の拍から鳴り始める
      lastBeatIndexRef.current = null;
      return;
    }

    const interval = secondsPerBeat(bpm);

    const timer = setInterval(() => {
      const now = usePlaybackStore.getState().currentTime;
      // いま何拍目を過ぎたか。**絶対時刻から出すので、ずれが溜まらない**
      const index = Math.floor((now - originSeconds) / interval);
      if (index < 0) return;

      const last = lastBeatIndexRef.current;
      if (last === index) return;
      lastBeatIndexRef.current = index;

      // 頭出しやスクラブで大きく飛んだときは、飛ばした拍を鳴らさない
      // （まとめて連打すると、拍ではなくノイズになる）
      if (last !== null && index - last > 1) return;

      const player = isDownbeat(originSeconds + index * interval, bpm, originSeconds, beatsPerBar)
        ? downbeat
        : beat;
      try {
        // 前の音が鳴り終わっていなくても頭から鳴らし直す
        player.seekTo(0);
        player.play();
      } catch {
        // 音が出せない状態（端末が塞いでいる等）。拍だけ黙る。
        // 時計と隊形は動き続ける
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isActive, bpm, beatsPerBar, originSeconds, downbeat, beat]);
}
