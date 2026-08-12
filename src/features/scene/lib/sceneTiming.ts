/**
 * シーンの時刻から、移動にかかる時間を導く。
 *
 * ■ 何が変わったか
 * 以前はシーンが「前のシーンからここへ来るのに何秒か」を持ち、時刻は
 * 先頭から足し算で出していた。この持ち方だと、途中の1つを変えるだけで
 * それ以降のシーンが全部後ろへずれ、曲に合わせて置いた隊形が曲から外れた。
 *
 * いまはシーンが「曲の何秒目か」を直接持つ。移動時間はここで毎回求める。
 * 触っていないシーンは動かない。
 *
 * ■ 移動時間を変えるということ
 * 「シーン2へ4秒かけたい」は、シーン2の時刻をシーン1の4秒後へ動かすこと。
 * その結果、シーン2→3の移動時間は縮む(3の時刻は動かないため)。
 * それを避けたいときのために、以降をまとめてずらす操作も用意する
 * (動画編集でいうリップル編集)。
 */

/** シーンとシーンの間に最低限空ける秒数。0にすると2つのシーンが同じ時刻に
 * 重なり、どちらの隊形を出せばよいか決まらなくなる */
export const MIN_SEGMENT_SECONDS = 0.1;

/**
 * シーンを新しく作るときに空ける秒数。
 *
 * 以前は1秒だった(transition_duration_seconds の既定値の名残)。
 * ただしステージを横切る距離を1秒で動くのは、このアプリ自身が
 * 「走らないと間に合いません」と警告する速さで、追加した直後の
 * まっさらなシーンに警告が出ていた。
 *
 * 2秒にすると、時間軸の上でもコマ同士が重ならずに並ぶ。
 */
export const DEFAULT_SEGMENT_SECONDS = 2;

/** 時刻の刻み。入力欄(SceneTimeField)が受け付ける桁と同じ */
export const SECONDS_STEP = 0.1;

/**
 * 時刻を 0.1秒 の刻みへ寄せる。
 *
 * 時間軸の上でコマを掴んで動かすと、1pxごとに 1/26秒 のような端数が出て
 * 「1.077秒で移動」のような数字になる。人が読む数でも、入力欄で打てる
 * 数でもないので、置いた瞬間に丸める。
 */
export function snapSeconds(seconds: number): number {
  return Math.round(seconds / SECONDS_STEP) * SECONDS_STEP;
}

type TimedScene = { id: string; timeSeconds: number };

/**
 * 各シーンへ入ってくるのにかかる時間。先頭は入ってくる元が無いので0。
 * 返す配列は scenes と同じ並び・同じ長さ。
 */
export function sceneDurations(scenes: TimedScene[]): number[] {
  return scenes.map((scene, index) => {
    if (index === 0) return 0;
    const gap = scene.timeSeconds - scenes[index - 1].timeSeconds;
    // 並びが壊れている(前より早い)場合でも負を返さない。
    // 呼び出し側は移動時間としてそのまま使うため
    return Math.max(0, roundSeconds(gap));
  });
}

/** 作品の長さ。先頭から最後のシーンまで */
export function totalSeconds(scenes: TimedScene[]): number {
  if (scenes.length === 0) return 0;
  return roundSeconds(
    scenes[scenes.length - 1].timeSeconds - scenes[0].timeSeconds,
  );
}

/** 0.1 + 0.2 = 0.30000000000000004 のような誤差を落とす。
 * 入力の刻みが0.1なので、その桁で丸めれば意味のある差は消えない */
function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export type RetimeResult = {
  /** 変更後の時刻。触っていないシーンは元の値のまま入る */
  timesById: Map<string, number>;
  /** 実際に採用された移動時間。詰まって縮められた場合は要求と違う */
  appliedSeconds: number;
};

/**
 * 「index番目のシーンへ入ってくる時間」を seconds にする。
 *
 * ripple が false なら、動かすのはそのシーン1つだけ。次のシーンとの間隔が
 * MIN_SEGMENT_SECONDS を割り込む場合は、割り込まないところまでで止める
 * (次のシーンを押しのけない)。
 *
 * ripple が true なら、そのシーン以降を同じだけまとめてずらす。
 * 後ろとの間隔は変わらないので、詰まることがない。
 */
export function retimeScene(
  scenes: TimedScene[],
  index: number,
  seconds: number,
  ripple: boolean,
): RetimeResult {
  const timesById = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
  // 先頭は「入ってくる時間」を持たない。動かす対象にならない
  if (index <= 0 || index >= scenes.length) {
    return { timesById, appliedSeconds: 0 };
  }

  const previousTime = scenes[index - 1].timeSeconds;
  const requested = Math.max(MIN_SEGMENT_SECONDS, seconds);
  let target = roundSeconds(previousTime + requested);

  if (!ripple) {
    const next = scenes[index + 1];
    if (next) {
      // 次のシーンを押しのけない。手前の余地いっぱいまでで止める
      const limit = roundSeconds(next.timeSeconds - MIN_SEGMENT_SECONDS);
      if (target > limit)
        target = Math.max(previousTime + MIN_SEGMENT_SECONDS, limit);
    }
    timesById.set(scenes[index].id, target);
    return {
      timesById,
      appliedSeconds: roundSeconds(target - previousTime),
    };
  }

  const shift = roundSeconds(target - scenes[index].timeSeconds);
  for (let i = index; i < scenes.length; i += 1) {
    timesById.set(scenes[i].id, roundSeconds(scenes[i].timeSeconds + shift));
  }
  return { timesById, appliedSeconds: roundSeconds(target - previousTime) };
}

/**
 * シーンを丸ごと別の時刻へ動かす(タイムライン上でつまんで動かす操作)。
 * 前後のシーンを追い越さない範囲に収める。
 */
export function moveSceneTo(
  scenes: TimedScene[],
  index: number,
  seconds: number,
): Map<string, number> {
  const timesById = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
  if (index < 0 || index >= scenes.length) return timesById;

  const previous = scenes[index - 1];
  const next = scenes[index + 1];
  const lower = previous ? previous.timeSeconds + MIN_SEGMENT_SECONDS : 0;
  const upper = next ? next.timeSeconds - MIN_SEGMENT_SECONDS : Infinity;

  // 前後が既に詰まっている場合、lower が upper を上回ることがある。
  // そのときは動かさない(押しのけるより、動かない方が読み取りやすい)
  if (lower > upper) return timesById;

  timesById.set(
    scenes[index].id,
    roundSeconds(Math.min(upper, Math.max(lower, seconds))),
  );
  return timesById;
}

/**
 * 複製したシーンを置く時刻。元のシーンと、その次のシーンの中間。
 * 次が無ければ既定の移動時間ぶん後ろへ置く。
 *
 * 中間に置くのは、複製が「元のすぐ後ろ」に並ぶ操作だから。
 * 末尾へ足すと、順番(order_index)と時刻の並びが食い違う
 */
export function duplicateTimeSeconds(
  scenes: TimedScene[],
  source: TimedScene,
): number {
  const index = scenes.findIndex((scene) => scene.id === source.id);
  const next = index >= 0 ? scenes[index + 1] : undefined;
  if (!next) return roundSeconds(source.timeSeconds + DEFAULT_SEGMENT_SECONDS);

  const middle = (source.timeSeconds + next.timeSeconds) / 2;
  // 元と次が既に詰まっている場合は、最低限だけ空けて割り込む
  return roundSeconds(
    Math.max(source.timeSeconds + MIN_SEGMENT_SECONDS, middle),
  );
}
