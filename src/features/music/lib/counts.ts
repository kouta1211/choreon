/**
 * 秒とカウントの読み替え。曲を入れずに振付を組むときの物差し。
 *
 * ■ 数える単位は小節ではなく【8カウント】
 * 稽古場では「4セット目の3」と数える。小節番号ではないので、
 * 拍子(4拍子か3拍子か)とは別の単位として扱う。拍子は
 * メトロノームの強拍を決めるためだけに使う。
 *
 * ■ 尺度は秒のまま
 * 「1拍 = 24px」と決めてしまうと、あとで曲を入れた瞬間に倍率が跳ぶ
 * (BPM 128 なら1拍 0.469秒 = 51px/秒 相当 → 24px/秒)。時間軸の尺度は
 * 秒に固定し、拍は BPM から出した【位置に線を引くだけ】にする。
 * こうすると、曲を入れても地の模様が波形へ変わるだけで、
 * 置いたシーンは1つも動かない。
 */

import { secondsPerBeat } from "@/features/music/lib/metronome";

/** 1セット = 8カウント。稽古場で数える単位 */
export const BEATS_PER_SET = 8;

export type CountPosition = {
  /** 何セット目か(1始まり) */
  set: number;
  /** そのセットの何カウント目か(1〜8) */
  count: number;
};

/** その秒数が何セットの何カウントにあたるか。曲の頭出し位置を原点にする */
export function countAt(
  seconds: number,
  bpm: number,
  originSeconds = 0,
): CountPosition {
  const beat = Math.floor((seconds - originSeconds) / secondsPerBeat(bpm));
  // 頭出しより手前(イントロの途中)は、1セット目の1カウントとして扱う
  if (beat < 0) return { set: 1, count: 1 };

  return {
    set: Math.floor(beat / BEATS_PER_SET) + 1,
    count: (beat % BEATS_PER_SET) + 1,
  };
}

/** 「4セット 2カウント」の形。操作行に出す。
 * 文そのものは辞書が持つ — セットとカウントの並び順は言語で変わる */
export function formatCount(
  position: CountPosition,
  format: (set: number, count: number) => string,
): string {
  return format(position.set, position.count);
}

/** いちばん近い拍へ寄せる。コマを置く位置に使う */
export function snapToBeat(
  seconds: number,
  bpm: number,
  originSeconds = 0,
): number {
  const interval = secondsPerBeat(bpm);
  const beat = Math.round((seconds - originSeconds) / interval);
  return Math.max(0, originSeconds + beat * interval);
}

/** いちばん近い8カウントの頭へ寄せる。帯を払ったときの止まり先に使う */
export function snapToSet(
  seconds: number,
  bpm: number,
  originSeconds = 0,
): number {
  const interval = secondsPerBeat(bpm) * BEATS_PER_SET;
  const set = Math.round((seconds - originSeconds) / interval);
  return Math.max(0, originSeconds + set * interval);
}

/** 惰性を見込む時間。指を離したあと、この長さぶん進んだ先を止まり先にする */
export const MOMENTUM_SECONDS = 0.3;

/** 1回のフリックで飛べるセット数の上限。
 * これが無いと、勢いよく払ったときに曲の終わりまで飛んでしまう */
export const MAX_FLICK_SETS = 4;

/**
 * 指を離したときの止まり先。
 *
 * ■ 惰性を計算に入れる理由
 * 離した瞬間の位置で止めると、勢いよく払っても1セットしか進まない。
 * 指が離れたあとも少し進む、という手応えを残しつつ、止まる場所だけは
 * 8カウントの頭に揃える。
 *
 * @param seconds 離した瞬間に見ていた時刻
 * @param velocitySecondsPerSecond 1秒あたり何秒ぶん軸が流れていたか
 */
export function flickTargetSeconds(
  seconds: number,
  velocitySecondsPerSecond: number,
  bpm: number,
  originSeconds = 0,
): number {
  const setSeconds = secondsPerBeat(bpm) * BEATS_PER_SET;
  const limit = setSeconds * MAX_FLICK_SETS;
  const carry = Math.max(
    -limit,
    Math.min(limit, velocitySecondsPerSecond * MOMENTUM_SECONDS),
  );
  return snapToSet(seconds + carry, bpm, originSeconds);
}

/**
 * 拍線を描くかどうか。
 *
 * 間隔が 8px を切ると、1pxの線と7pxの隙間になり、潰れて灰色の面に
 * 見える。そうなると「拍がある」ことすら伝わらないので、いっそ描かない。
 * 既定倍率(24px/秒)なら BPM 180 からがこれに当たる。
 */
export const MIN_BEAT_LINE_GAP_PX = 8;

export function shouldDrawBeatLines(bpm: number, pxPerSecond: number): boolean {
  return secondsPerBeat(bpm) * pxPerSecond > MIN_BEAT_LINE_GAP_PX;
}
