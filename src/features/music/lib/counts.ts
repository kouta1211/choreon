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

/**
 * その**拍**が何セットの何カウントにあたるか。
 *
 * ⚠️ **秒を経由しない**（2026-08-26）。以前は `countAt(秒, bpm, 原点)` で
 * 秒から拍を逆算していたが、
 *
 *  - 拍 → 秒 → 拍 の往復で**丸めがずれる**
 *  - **テンポの変わる曲**（placement が複数）では bpm 1つでは戻せない
 *
 * `positionBeats` が保存の正になった（2026-08-25）ので、
 * 拍をそのまま受ければ割り算1つで済む。
 *
 * 負の拍は 1セット目の1カウントとして扱う（振付の頭より手前を指した
 * ときで、画面に `0-0` と出しても読む人には何の情報も無い）。
 */
export function countAtBeat(beat: number): CountPosition {
  const whole = Math.floor(beat);
  if (whole < 0) return { set: 1, count: 1 };

  return {
    set: Math.floor(whole / BEATS_PER_SET) + 1,
    count: (whole % BEATS_PER_SET) + 1,
  };
}

/**
 * `3-5` の形。**3セット目の5カウント**。
 *
 * ■ なぜ記号で書くのか（2026-08-26）
 * 以前は辞書が「4セット 2カウント」という文を持っていた。読みやすいが
 * **下のバーにも一覧の行にも収まらない**（そこは幅が決まっている）。
 * 稽古場で口に出すのも「3の5」で、語は付けない。
 *
 * 区切りは言語で変わらないので、**辞書には持たせない** — 3言語ぶんの
 * 同じ文字列が増えるだけで、片方だけ直る事故の口になる。
 */
export function formatCount(position: CountPosition): string {
  return `${position.set}-${position.count}`;
}

/** 拍から直接 `3-5` を作る近道。読む側はほとんどこれ1つで足りる */
export function countLabelAtBeat(beat: number): string {
  return formatCount(countAtBeat(beat));
}

/**
 * `3-5` を**拍**へ戻す。読めなければ `null`（呼ぶ側が前の値へ戻す）。
 *
 * ■ 受ける形をゆるくする理由
 * 打つのは稽古中の人で、記号を正確に選べる状況ではない。
 * `3-5` `3 5` `3－5`（全角）`3ー5` を同じものとして受ける。
 * **区切りが1つある2つの数**なら通す、という線で引いている。
 *
 * ■ カウントは1始まり
 * `1-1` が 0拍目。**`0-0` や `3-0` は読めない値として弾く** —
 * 丸めて受けると、打った数と画面の数が食い違う。
 * カウントが8を超える値（`1-9`）も弾く（1セットは8カウント）。
 */
export function parseCountLabel(text: string): number | null {
  // 全角の数字を半角へ寄せてから見る
  const normalized = text
    .trim()
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    );

  /* **端から端まで当てる。** 区切りで割って数だけ拾うと、`-1-2` の
     ような打ち間違いから先頭の記号が黙って落ち、`1-2` として通ってしまう */
  const matched = /^(\d+)\s*[-‐‑–—ー－\s]\s*(\d+)$/.exec(normalized);
  if (!matched) return null;

  const set = Number(matched[1]);
  const count = Number(matched[2]);
  if (set < 1 || count < 1 || count > BEATS_PER_SET) return null;

  return (set - 1) * BEATS_PER_SET + (count - 1);
}

/**
 * 何カウントぶんか、を読む形にする。**区間の長さに使う**。
 *
 * 位置（`3-5`）とは別の形にしてある。`2` と `2-1` は別のもので、
 * 同じ書き方にすると「2カウントの区間」と「2セット目の1」が
 * 見分けられなくなる。
 */
export function countLengthLabel(beats: number): string {
  return String(Math.max(0, Math.round(beats * 100) / 100));
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
const MOMENTUM_SECONDS = 0.3;

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
const MIN_BEAT_LINE_GAP_PX = 8;

export function shouldDrawBeatLines(bpm: number, pxPerSecond: number): boolean {
  return secondsPerBeat(bpm) * pxPerSecond > MIN_BEAT_LINE_GAP_PX;
}
