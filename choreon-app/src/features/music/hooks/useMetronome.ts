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

/**
 * 拍を見に行く間隔（ms）。**ここが、鳴り出しの遅れの上限になる。**
 *
 * 20ms から詰めた。240BPM でも拍の間隔は 250ms あるので、8ms なら
 * 1拍につき30回は見に行ける。JS のタイマーは詰まれば遅れるが、
 * **遅れても次の見張りで取り返す**（拍の時刻は絶対値で決まるため、
 * ずれは溜まらない）。
 */
const TICK_MS = 8;

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
 * この作りは**拍が揺れるかもしれない**。鳴り出しの遅れは見張りの間隔
 * （8ms）が上限で、ずれは溜まらないが、1拍ごとのばらつきは残る。
 *
 * **直すなら `react-native-audio-api`（Web Audio API 相当）を入れて
 * 予約式へ寄せることになるが、あれは iOS/Android のネイティブコードを
 * 含むので Expo Go では動かない** — 確認のやり方が「QRを読む」から
 * 「開発ビルドを作る」へ変わる。揺れが我慢できないと分かってから
 * 決める話なので、いまは入れていない。拍の計算（metronome.ts）は
 * そのまま使えるので、移るときの手戻りは小さい。
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
  /** 音を一度通したか。**初回の1拍目だけ遅れるのを防ぐ**（下の注） */
  const warmedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      // 止めたら番号を捨てる。次に再生したとき、その場の拍から鳴り始める
      lastBeatIndexRef.current = null;
      return;
    }

    const interval = secondsPerBeat(bpm);

    // **1拍目だけ遅れるのを防ぐ。** 音は初めて鳴らすときに用意が入るので、
    // その1回ぶんが拍の頭にぶつかると出だしがもたつく。無音で通しておく
    if (!warmedRef.current) {
      warmedRef.current = true;
      try {
        for (const player of [downbeat, beat]) {
          player.volume = 0;
          player.play();
          player.pause();
          player.seekTo(0);
          player.volume = 1;
        }
      } catch {
        // 通せなくても鳴らす方には影響しない
      }
    }

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
