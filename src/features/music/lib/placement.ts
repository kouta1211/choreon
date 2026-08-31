/**
 * **拍と秒の写像**。振付は拍で持ち、秒はここから毎回導く。
 *
 * ■ なぜ拍が正なのか（2026-08-25）
 * 振付は**カウントで組み、最後に曲へ載せる**。載せ方を変えても
 * （曲を差し替える・伸ばして合わせ直す）**振付の中身は1つも変わらない**
 * のが正しい。秒を正にすると、載せ直すたびに隊形が音からずれる。
 *
 * ■ 配列で持つ理由
 * 要素が1つでも配列にしておく。**テンポが変わる曲**は、振付を区切って
 * 別々に載せる形で表す（変わり目ごとに1要素）。ここを単数で始めると、
 * 増やすときに**保存済みの全作品を移行することになる**。
 *
 * ■ `atSeconds` は【作品の時間】で測る
 * 2026-08-26（第4段）から**曲の時間と同じ**。再生は
 * `audio.currentTime = 作品の時間` で、頭出し（旧 `music_offset_seconds`）
 * は無くなり、振付が曲の途中から始まる作品はこの `atSeconds` がそれを言う。
 *
 * ⚠️ 古い作品にはまだ DB の `music_offset_seconds` 列に値が残っている。
 * 読むときに `foldLegacyOffset` でここへ畳む（`project/api/projects.ts`
 * と `settings/lib/backup.ts` の2箇所から呼ぶ）。列そのものは
 * `schema.sql` の注記どおり、まだ落とさない。
 */

import {
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
} from "@/features/music/lib/metronomePreference";
import { secondsPerBeat } from "@/features/music/lib/metronome";

/** 拍→秒の写像。1つの区間ぶん */
export type Placement = {
  /** この載せ方が効き始める拍。最初の要素は 0 */
  fromBeat: number;
  /** その拍が【作品の時間の】何秒目か */
  atSeconds: number;
  /** 1拍の長さ（秒）。**0以下は許さない** */
  secondsPerBeat: number;
};

/** 曲を入れていない作品の既定。BPM 120 = 1拍 0.5秒 */
export const DEFAULT_PLACEMENTS: readonly Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: secondsPerBeat(DEFAULT_BPM) },
];

/**
 * 秒の丸め。`sceneTiming` の中の丸めと同じ桁。
 *
 * **写像そのものでは丸めない。** 丸めると `拍 → 秒 → 拍` の往復が
 * ずれ、繰り返すたびに積もる。丸めるのは**画面へ出す秒を作るときだけ**
 * （`withDerivedTimes` と `durationSeconds`）。
 */
function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * **外から来た値の門番。** `music_placements` は jsonb なので、
 * DB は中身を守ってくれない。
 *
 * `secondsPerBeat` に 0 が1つ入るだけで、**全シーンの秒が `Infinity` になり、
 * 画面はシーンが1つも無いように見える**。壊れて見えないので気づけない。
 *
 * @param fallbackBpm 何も取れなかったときに使う速さ（作品の `bpm`）
 */
export function normalizePlacements(
  raw: unknown,
  fallbackBpm: number = DEFAULT_BPM,
): Placement[] {
  const fallback: Placement[] = [
    {
      fromBeat: 0,
      atSeconds: 0,
      secondsPerBeat: secondsPerBeat(clampBpm(fallbackBpm)),
    },
  ];
  if (!Array.isArray(raw)) return fallback;

  const parsed = raw
    .map(toPlacement)
    .filter((item): item is Placement => item !== null)
    // 効き始める拍の順に並べ直す。降順で来ても答えを変えない
    .sort((a, b) => a.fromBeat - b.fromBeat);

  if (parsed.length === 0) return fallback;
  // 先頭は必ず 0 から。手前に隙間があると、そこの拍を写せない
  return [{ ...parsed[0], fromBeat: 0 }, ...parsed.slice(1)];
}

function toPlacement(raw: unknown): Placement | null {
  if (raw === null || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const fromBeat = finite(item.fromBeat);
  const atSeconds = finite(item.atSeconds);
  const perBeat = finite(item.secondsPerBeat);
  if (fromBeat === null || atSeconds === null || perBeat === null) return null;
  // 1拍の長さが0以下だと、拍と秒の対応が付かない
  if (perBeat <= 0) return null;
  return { fromBeat, atSeconds, secondsPerBeat: perBeat };
}

function finite(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

/** その拍を含む区間。**先頭より手前の拍も先頭の区間で写す**
 *  （1カウント目より前に置かれた隊形は、負の秒になるのが正しい） */
function placementAtBeat(
  placements: readonly Placement[],
  beat: number,
): Placement {
  let found = placements[0];
  for (const item of placements) {
    if (item.fromBeat <= beat) found = item;
    else break;
  }
  return found;
}

/** その秒を含む区間 */
function placementAtSeconds(
  placements: readonly Placement[],
  seconds: number,
): Placement {
  let found = placements[0];
  for (const item of placements) {
    if (item.atSeconds <= seconds) found = item;
    else break;
  }
  return found;
}

/** 拍 → 作品の時間（秒） */
export function secondsAtBeat(
  placements: readonly Placement[],
  beat: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const at = placementAtBeat(list, beat);
  return at.atSeconds + (beat - at.fromBeat) * at.secondsPerBeat;
}

/** 作品の時間（秒） → 拍 */
export function beatAtSeconds(
  placements: readonly Placement[],
  seconds: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const at = placementAtSeconds(list, seconds);
  return at.fromBeat + (seconds - at.atSeconds) / at.secondsPerBeat;
}

/**
 * 拍で測った長さを、秒の長さへ直す。
 *
 * **差で定義する。** 区間の途中で載せ方が変わると「1拍が何秒か」は
 * 1つに決まらないので、`長さ = 終わりの秒 − 始まりの秒` として出す。
 *
 * @param endBeat 区間の終わりの拍（＝次のシーンの位置）
 * @param beats その手前へ何拍ぶんか
 */
export function durationSeconds(
  placements: readonly Placement[],
  endBeat: number,
  beats: number,
): number {
  return roundSeconds(
    secondsAtBeat(placements, endBeat) -
      secondsAtBeat(placements, endBeat - beats),
  );
}

/** 秒の長さを、拍の長さへ直す（`durationSeconds` の逆） */
export function durationBeats(
  placements: readonly Placement[],
  endBeat: number,
  seconds: number,
): number {
  return endBeat - beatAtSeconds(placements, secondsAtBeat(placements, endBeat) - seconds);
}

/** 拍を持つもの。`Scene` そのものに依存しない（テストしやすさのため） */
type Beated = { positionBeats: number; moveBeats?: number | null };
/** 派生させた秒を載せたもの */
type Timed = { timeSeconds: number; moveSeconds: number | null };

/**
 * **派生した秒を載せる。作る口はここ1つだけ。**
 *
 * `scene.timeSeconds` を直接読む所が34ファイルある。それらを凍結したまま
 * 正を拍へ移すために、**メモリ上の `Scene` には秒を載せ続ける**。
 * 作る場所が散ると、必ずどこかが「拍を持たないシーン」を作る
 * （`.claude/rules/state.md` 6節）。
 *
 * `moveSeconds` は**区間の長さ**なので、`durationSeconds` で差から出す。
 */
export function withDerivedTimes<T extends Beated>(
  scenes: readonly T[],
  placements: readonly Placement[],
): (T & Timed)[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return scenes.map((scene) => ({
    ...scene,
    timeSeconds: roundSeconds(secondsAtBeat(list, scene.positionBeats)),
    moveSeconds:
      scene.moveBeats == null
        ? null
        : durationSeconds(list, scene.positionBeats, scene.moveBeats),
  }));
}

/**
 * 秒で来た変更を、拍へ直す。
 *
 * `updateSceneTimes` を呼ぶ所が4つあり、**それぞれで換算を書くと必ず
 * どこかが取り残される**。通り道を1本にするためのもの。
 */
export function beatsForTimes(
  timesById: ReadonlyMap<string, number>,
  placements: readonly Placement[],
): Map<string, number> {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const beats = new Map<string, number>();
  for (const [id, seconds] of timesById) {
    beats.set(id, beatAtSeconds(list, seconds));
  }
  return beats;
}

/* **`regrid`（秒を保って拍を数え直す）は消した**（2026-08-26・第4段）。

   速さの入力が `restretch` になって、呼ぶ人が居なくなった。
   画面が秒を出していたころは「BPM を変えてもコマが動かない」方が
   自然に見えたが、第2段でカウントを出した瞬間に壊れた —
   数え直すと `3-5` が `2-8` になり、**振付の中身が書き換わる**。

   要るとしたら「実は倍テンポで数えていた」という直しだが、
   まだ困っていないので作らない。復活させるなら、
   **カウントが変わる操作だと画面で言い切ってから**。 */


/**
 * **拍はそのまま。秒を伸ばす。**（曲へ載せる操作。第3段で使う）
 *
 * ⚠️ **`regrid` と取り違えない。** こちらは隊形が音の上で動く。
 */
export function restretch(
  placements: readonly Placement[],
  nextSecondsPerBeat: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!Number.isFinite(nextSecondsPerBeat) || nextSecondsPerBeat <= 0) {
    return [...list];
  }
  return list.map((item) => ({ ...item, secondsPerBeat: nextSecondsPerBeat }));
}

/**
 * 2つの拍を「同じ位置」とみなすか。
 *
 * **秒で `===` を書かないためのもの**（2026-08-25）。秒は拍から導いた
 * 派生値なので、丸めの都合で `4.000000000000001` のような値になる。
 * 秒で等号を書くと:
 * - 動かしていない行まで「変わった」と判定して書き込む
 * - シーンの重なり検出が**二度と一致せず**、2つのシーンが同じ位置に重なれる
 *
 * 幅は 1e-6 拍。BPM 120 なら 0.5マイクロ秒で、人が意図して作れる差ではない。
 */
export function sameBeat(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

/** いまの物差しを BPM で読む。**古い列や、音を鳴らす側へ渡すため** */
export function bpmOf(placements: readonly Placement[]): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return clampBpm(60 / list[0].secondsPerBeat);
}

/**
 * **1拍目が【作品の時間の】何秒目か。**
 *
 * ただの秒だが、**別の型にしてある**。理由は 2026-08-26 に踏んだバグで、
 * 拍の原点へ `musicOffsetSeconds`（曲の再生開始位置）が5箇所で
 * 渡されていた。あの列は**曲の時間**で測っていて、時間軸の方は既に
 * 作品の時間（`audio.currentTime - musicOffsetSeconds`）なので、
 * 渡すと**原点を二重に足す**。
 *
 * ⚠️ **見ても気づけない壊れ方だった。** 頭出しが 0 の作品では両者が
 * 一致するので、普通に使っている限り画面は正しく見える。
 * テストも 221件が緑のままだった（原点に 999 を入れても落ちなかった）。
 *
 * だから**素の `number` を受け付けない**。`BeatOriginSeconds` を作れるのは
 * この関数だけで、`musicOffsetSeconds` を渡そうとすると**型で落ちる**。
 */
export type BeatOriginSeconds = number & {
  readonly __beatOriginSeconds: unique symbol;
};

export function beatOriginSeconds(
  placements: readonly Placement[],
): BeatOriginSeconds {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return list[0].atSeconds as BeatOriginSeconds;
}

/* ────────────────────────────────────────────────────────────
   曲へ載せる（第3段・2026-08-26）

   振付はカウントで組んである。**載せる**とは、その拍の列を曲の
   どこへ、どれだけの長さで置くかを決めること。決めるのは2つだけ:

     - **どこから**（`atSeconds`）… 振付の1拍目が作品の何秒目か
     - **どれだけ**（`secondsPerBeat`）… 1拍の長さ

   拍そのものは1つも動かない。**動くのは秒だけ**なので、載せ直しても
   振付の中身（何カウント目にどの隊形か）は変わらない。
   ──────────────────────────────────────────────────────────── */

/** 振付が曲のどこに載っているか。**作品の時間**での区間 */
export type PlacedSpan = {
  /** 1拍目の秒 */
  fromSeconds: number;
  /** 最後の拍の秒。振付が1拍もなければ `fromSeconds` と同じ */
  toSeconds: number;
};

/**
 * いま振付が載っている区間。**帯の上にバーとして描くために読む。**
 *
 * @param lastBeat いちばん後ろのシーンの拍。0以下なら長さ0の区間
 */
export function placedSpan(
  placements: readonly Placement[],
  lastBeat: number,
): PlacedSpan {
  const from = beatOriginSeconds(placements);
  if (!Number.isFinite(lastBeat) || lastBeat <= 0) {
    return { fromSeconds: from, toSeconds: from };
  }
  return { fromSeconds: from, toSeconds: secondsAtBeat(placements, lastBeat) };
}

/**
 * **振付ぜんぶを、曲の中で前後へ動かす。** 速さは変えない。
 *
 * バーの真ん中を掴んで引く操作がこれ。1拍目を `atSeconds` へ置き直す
 * だけで、拍の間隔（`secondsPerBeat`）には触らない。
 *
 * ⚠️ **区切りが複数あるときは、全部を同じだけずらす。** 先頭だけ動かすと
 * テンポの変わり目より後ろが置き去りになり、そこから先の秒が飛ぶ。
 *
 * 負の秒には置けない（曲が始まる前に振付は始まらない）。
 */
export function reanchor(
  placements: readonly Placement[],
  atSeconds: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!Number.isFinite(atSeconds)) return [...list];

  const shift = Math.max(0, atSeconds) - list[0].atSeconds;
  return list.map((item) => ({
    ...item,
    atSeconds: roundSeconds(item.atSeconds + shift),
  }));
}

/**
 * 古い `music_offset_seconds` を、載せ方の `atSeconds` へ畳む
 * （2026-08-26・第4段）。
 *
 * どちらも「振付が曲の何秒目から始まるか」を言っていたが、測っている
 * 時計が違った（列は曲の時間、`atSeconds` は作品の時間）。第3段で
 * バーが後者を持ったので、読むときにここで1つへまとめる。
 *
 * 呼ぶのは `project/api/projects.ts`（Supabase から読むとき）と
 * `settings/lib/backup.ts`（書き出しファイルを取り込むとき）の2箇所。
 */
export function foldLegacyOffset(
  placements: Placement[],
  legacyOffsetSeconds: number,
): Placement[] {
  if (!Number.isFinite(legacyOffsetSeconds) || legacyOffsetSeconds <= 0) {
    return placements;
  }
  return reanchor(placements, placements[0].atSeconds + legacyOffsetSeconds);
}

/**
 * **振付の終わりを、曲のこの秒へ合わせる。** 頭は動かさない。
 *
 * バーの右の取っ手を掴んで引く操作がこれ。頭（`atSeconds`）を軸に、
 * 最後の拍が `endSeconds` に来るような1拍の長さを出して伸縮させる。
 *
 * ⚠️ **速さには上限と下限がある**（`MIN_BPM` 〜 `MAX_BPM`）。
 * 縮めすぎ・伸ばしすぎは、そこで止まる — 止めないと1拍が0秒になり、
 * **全シーンの秒が同じ値に潰れる**。
 *
 * @param lastBeat いちばん後ろのシーンの拍。0以下なら伸縮しようがない
 */
export function stretchToEnd(
  placements: readonly Placement[],
  lastBeat: number,
  endSeconds: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!Number.isFinite(lastBeat) || lastBeat <= 0) return [...list];
  if (!Number.isFinite(endSeconds)) return [...list];

  const from = list[0].atSeconds;
  const wanted = (endSeconds - from) / lastBeat;
  /* 速さの形に直してから丸める。秒のまま丸めると、上限・下限の
     すぐ内側で「押しても動かない」帯ができる */
  const nextSecondsPerBeat = 60 / clampBpm(60 / Math.max(1e-6, wanted));
  return restretch(list, nextSecondsPerBeat);
}
