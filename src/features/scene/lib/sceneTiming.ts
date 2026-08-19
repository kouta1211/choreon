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
 * 【1つの8カウントぶん】。BPM 120 なら 8カウントがちょうど4秒で、
 * 振付を数える単位そのものになる。
 *
 * 以前は1秒だった(transition_duration_seconds の既定値の名残)。
 * ステージを横切る距離を1秒で動くのは、このアプリ自身が
 * 「走らないと間に合いません」と警告する速さで、追加した直後の
 * まっさらなシーンに警告が出ていた。
 *
 * 時間軸の上でも効く。既定倍率(24px/秒)で4秒は96pxあり、
 * コマ(隊形の絵)のまま並ぶ。ここが詰まっていると、何も設定して
 * いない作品で隊形の絵が出ず、この画面の値打ちがいちばん損なわれる。
 */
export const DEFAULT_SEGMENT_SECONDS = 4;

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
 *
 * 【前後を追い越してよい】。並び順は時刻の昇順で決まるので、隣を
 * 追い越せばそのまま順番が入れ替わる。追い越さないよう手前で止めると、
 * 「3番目を頭に持ってきたい」がこの操作ではできなくなり、
 * 一覧を開いて並び替えるしかなくなる。
 *
 * 曲の頭より手前へは行かない。負の時刻は「曲が始まる前」という
 * 意味になってしまう。
 */
export function moveSceneTo(
  scenes: TimedScene[],
  index: number,
  seconds: number,
): Map<string, number> {
  const timesById = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
  if (index < 0 || index >= scenes.length) return timesById;

  const target = roundSeconds(Math.max(0, seconds));
  // ちょうど同じ時刻に重ねると、どちらの隊形を出すか決まらなくなる。
  // 既に居るところへ置こうとしたときだけ、最小の間隔ぶんずらす
  const taken = scenes.some(
    (scene, i) => i !== index && scene.timeSeconds === target,
  );
  timesById.set(
    scenes[index].id,
    taken ? roundSeconds(target + MIN_SEGMENT_SECONDS) : target,
  );
  return timesById;
}

/**
 * 一覧で行を並び替えたときの時刻。
 *
 * 動いた1つだけを、【新しい隣同士の中間】へ置く。触っていないシーンの
 * 時刻は変えない。全部を等間隔に振り直すやり方もあるが、それだと
 * 曲に合わせて置いた他のシーンまで動く。
 *
 * 動いた1つを、位置のずれがいちばん大きいものとして選ぶ。隣同士の
 * 入れ替えはどちらを動いたと見ても結果の並びは同じなので、
 * 取り違えても困らない。
 */
export function retimeForOrder(
  scenes: TimedScene[],
  orderedIds: string[],
): Map<string, number> {
  const timesById = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
  const oldIndexById = new Map(scenes.map((scene, i) => [scene.id, i]));

  let movedId: string | null = null;
  let largestShift = 0;
  orderedIds.forEach((id, newIndex) => {
    const oldIndex = oldIndexById.get(id);
    if (oldIndex === undefined) return;
    const shift = Math.abs(newIndex - oldIndex);
    if (shift > largestShift) {
      largestShift = shift;
      movedId = id;
    }
  });
  if (movedId === null) return timesById;

  const at = orderedIds.indexOf(movedId);
  const before = timesById.get(orderedIds[at - 1] ?? "");
  const after = timesById.get(orderedIds[at + 1] ?? "");

  let target: number;
  if (before !== undefined && after !== undefined) {
    target = (before + after) / 2;
  } else if (before !== undefined) {
    target = before + DEFAULT_SEGMENT_SECONDS;
  } else if (after !== undefined) {
    // 先頭へ移した。曲の頭より手前は無いので、0との中間に置く
    target = after / 2;
  } else {
    return timesById;
  }

  timesById.set(movedId, roundSeconds(Math.max(0, target)));
  return timesById;
}

/**
 * あるシーンの【すぐ後ろ】へ、**後ろを押しのけて**差し込む時刻。
 *
 * 曲も拍も無いとき（順番だけで作っているとき）の追加はこちら。
 * `duplicateTimeSeconds` は元と次の【中間】へ置くので、**間に1つ足すたびに
 * 前後の移動時間が半分になる**。秒数そのものが user の決めた値である
 * 作品では、足しただけで 4秒 が 2秒 になってはいけない。
 *
 * ここでは新しいシーンに `segmentSeconds` を与え、それより後ろのシーンを
 * 同じだけまとめて後ろへずらす。**触っていないシーンの移動時間は変わらない**
 * （変わるのは「新しいシーンが1つ挟まった」ことだけ）。
 *
 * @returns 新しいシーンの時刻と、ずらす必要があるシーンの新しい時刻
 */
export function insertAfterSeconds(
  scenes: TimedScene[],
  source: TimedScene | undefined,
  segmentSeconds: number = DEFAULT_SEGMENT_SECONDS,
): { timeSeconds: number; shifted: Map<string, number> } {
  const shifted = new Map<string, number>();
  const step = Math.max(MIN_SEGMENT_SECONDS, segmentSeconds);

  if (!source) return { timeSeconds: 0, shifted };

  const timeSeconds = roundSeconds(source.timeSeconds + step);
  const index = scenes.findIndex((scene) => scene.id === source.id);
  if (index === -1) return { timeSeconds, shifted };

  for (const scene of scenes.slice(index + 1)) {
    shifted.set(scene.id, roundSeconds(scene.timeSeconds + step));
  }
  return { timeSeconds, shifted };
}

/**
 * 並び替えた結果を、**各シーンの移動時間を保ったまま**積み直す。
 *
 * 曲も拍も無いとき（順番だけで作っているとき）の並び替えはこちら。
 * `retimeForOrder` は動いた1つを新しい隣同士の【中間】へ置くので、
 * その前後の移動時間が勝手に変わる。時刻を合わせる相手が居る作品では
 * それが正しい（触っていないシーンを動かさない）が、**秒数そのものが
 * user の決めた値**である作品では、並べ替えただけで 4秒 が 2秒 になる。
 *
 * ここでは各シーンが「入ってくるのにかかる秒数」を持ち歩き、新しい順に
 * 積み直す。先頭は0から始まる。
 *
 * 先頭だったシーンが後ろへ動くと、持ち歩く秒数が無い（先頭は入ってくる
 * 元を持たない）。そのときだけ既定の秒数を使う — 0 にすると前のシーンと
 * 同じ時刻に重なり、どちらの隊形を出すか決まらなくなる。
 */
export function restackForOrder(
  scenes: TimedScene[],
  orderedIds: string[],
  /** 先頭だったシーンが後ろへ動いたときに使う秒数 */
  segmentSeconds: number = DEFAULT_SEGMENT_SECONDS,
): Map<string, number> {
  const durations = sceneDurations(scenes);
  const carried = new Map(
    scenes.map((scene, index) => [scene.id, durations[index]]),
  );

  const timesById = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
  let cursor = scenes[0]?.timeSeconds ?? 0;

  orderedIds.forEach((id, index) => {
    if (!timesById.has(id)) return;
    if (index === 0) {
      timesById.set(id, roundSeconds(cursor));
      return;
    }
    const step = carried.get(id) || segmentSeconds;
    cursor = roundSeconds(cursor + Math.max(MIN_SEGMENT_SECONDS, step));
    timesById.set(id, cursor);
  });

  return timesById;
}

/**
 * 新しいシーンを置く時刻。押した瞬間の再生位置に作る。
 *
 * そこに既に居る場合は、次のシーンとの中間へ割り込む。曲を聴きながら
 * 「ここ」と思った場所に置けることが要点なので、末尾へ足す作りには戻さない。
 */
export function insertTimeSeconds(
  scenes: TimedScene[],
  atSeconds: number,
  /** 空きが無いときに空ける秒数。設定から渡す(既定は1つの8カウント) */
  segmentSeconds: number = DEFAULT_SEGMENT_SECONDS,
): number {
  const target = roundSeconds(Math.max(0, atSeconds));
  const sorted = [...scenes].sort((a, b) => a.timeSeconds - b.timeSeconds);

  const collision = sorted.find(
    (scene) => Math.abs(scene.timeSeconds - target) < MIN_SEGMENT_SECONDS,
  );
  if (!collision) return target;

  const next = sorted.find(
    (scene) => scene.timeSeconds > collision.timeSeconds,
  );
  if (!next) return roundSeconds(collision.timeSeconds + segmentSeconds);
  return roundSeconds(
    Math.max(
      collision.timeSeconds + MIN_SEGMENT_SECONDS,
      (collision.timeSeconds + next.timeSeconds) / 2,
    ),
  );
}

/** 時刻の昇順。同じ時刻なら元の並び(order_index)を保つ。
 * 並び順の正は時刻なので、読み込みも追加も編集もここを通す */
export function sortScenes<T extends TimedScene & { orderIndex: number }>(
  scenes: T[],
): T[] {
  return [...scenes].sort(
    (a, b) => a.timeSeconds - b.timeSeconds || a.orderIndex - b.orderIndex,
  );
}

/**
 * あるシーンの【すぐ後ろ】へ差し込む時刻。元のシーンと、その次のシーンの
 * 中間。次が無ければ既定の移動時間ぶん後ろへ置く。
 *
 * 中間に置くのは、複製が「元のすぐ後ろ」に並ぶ操作だから。
 * 末尾へ足すと、順番(order_index)と時刻の並びが食い違う。
 *
 * 複製(useDuplicateScene)と、【曲が無いときの追加】(useAddScene)が使う。
 * 曲が無いときは「聞いている位置」が無いので、選んでいるシーンの隣が
 * 「ここに足す」のいちばん近い意味になる。
 */
export function duplicateTimeSeconds(
  scenes: TimedScene[],
  source: TimedScene,
  /** 次が無いときに空ける秒数。設定から渡す(既定は1つの8カウント) */
  segmentSeconds: number = DEFAULT_SEGMENT_SECONDS,
): number {
  const index = scenes.findIndex((scene) => scene.id === source.id);
  const next = index >= 0 ? scenes[index + 1] : undefined;
  if (!next) return roundSeconds(source.timeSeconds + segmentSeconds);

  const middle = (source.timeSeconds + next.timeSeconds) / 2;
  // 元と次が既に詰まっている場合は、最低限だけ空けて割り込む
  return roundSeconds(
    Math.max(source.timeSeconds + MIN_SEGMENT_SECONDS, middle),
  );
}
