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

/** 拍→秒の写像。1つの区間ぶん。**画面では「区切り」と呼ぶ** */
export type Placement = {
  /** この載せ方が効き始める拍。最初の要素は 0 */
  fromBeat: number;
  /** その拍が【作品の時間の】何秒目か */
  atSeconds: number;
  /** 1拍の長さ（秒）。**0以下は許さない** */
  secondsPerBeat: number;
  /**
   * その区間の名前（曲名・「Bメロ」など）。**無くてよい**。
   *
   * 画面に出すときの既定（「2曲目」）は**ここへ書かない** — 言語ごとに
   * 変わるので、文言の側（`useT()`）が番号から作る。ここに既定を入れると
   * 日本語が3言語をすり抜けて焼き付く。
   */
  label?: string;
};

/**
 * 区切りの名前の長さの上限。時間軸のラベルに収まる範囲で切る。
 *
 * 長さを縛るのは見た目のためだけではない。`music_placements` は jsonb で、
 * 区切りの数だけ行に積もる。歯止めが無いと1行が青天井に育つ。
 */
export const MAX_SECTION_LABEL_LENGTH = 40;

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

  /* **同じ拍から始まる区間を2つ残さない。** `placementAtBeat` は後ろを
     採るので、手前の1つは**誰にも読まれないまま**残る。壊れて見えないので
     気づけない（`.claude/rules/testing.md` の「後ろが勝って前が消える」と
     同じ形）。読まれない方を落とす */
  const deduped: Placement[] = [];
  for (const item of parsed) {
    const last = deduped[deduped.length - 1];
    if (last && sameBeat(last.fromBeat, item.fromBeat)) deduped.pop();
    deduped.push(item);
  }

  // 先頭は必ず 0 から。手前に隙間があると、そこの拍を写せない
  return [{ ...deduped[0], fromBeat: 0 }, ...deduped.slice(1)];
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

  const label = normalizeLabel(item.label);
  return label === null
    ? { fromBeat, atSeconds, secondsPerBeat: perBeat }
    : { fromBeat, atSeconds, secondsPerBeat: perBeat, label };
}

/**
 * 区切りの名前を整える。**空白だけの名前は「無い」と同じ**にする。
 *
 * 空文字を持たせると、画面側で「名前がある」と判定されて空のラベルが
 * 描かれる。持たせないのが正。
 */
export function normalizeLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_SECTION_LABEL_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
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

/**
 * その拍の速さを BPM で読む。**音を鳴らす側と、拍の線を引く側へ渡す。**
 *
 * ⚠️ **拍を受け取る形にしてある**（2026-09-15）。以前は `bpmOf(placements)` で
 * **先頭の区間**の速さだけを返していた。区切りが1つのうちは正しかったが、
 * 曲が変わる作品では**2曲目でも1曲目の速さを答える** — メトロノームも
 * 拍の線も、途中から静かにずれる。画面は動いて見えるので気づけない。
 */
export function bpmAt(placements: readonly Placement[], beat: number): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return clampBpm(60 / placementAtBeat(list, beat).secondsPerBeat);
}

/**
 * その**秒**の速さを BPM で読む。**時計を持っている側から呼ぶ。**
 *
 * メトロノームと予備拍は「いま何拍目か」ではなく「いま何秒目か」しか
 * 持っていない（音そのものが時計）。拍へ直してから引くと、区切りの
 * 境目で往復の丸めがぶつかるので、秒のまま引く。
 */
export function bpmAtSeconds(
  placements: readonly Placement[],
  seconds: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return clampBpm(60 / placementAtSeconds(list, seconds).secondsPerBeat);
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

/* ────────────────────────────────────────────────────────────
   区切り（曲の変わり目）・2026-09-15

   ショーケースは1本の中で曲が変わる。振付はカウントで組むので
   **拍の列は切れない** — 切れるのは載せ方の側だけ。

     区切りを増やす  splitAt         （秒は1つも動かない）
     区切りを外す    mergeAt
     その区間の速さ  restretchAt / stretchSectionToEnd
     その区間の頭    moveSectionTo

   ⚠️ **区間どうしを越境させない。** ある区間の最後の拍が次の区切りの秒を
   追い越すと、拍に対する秒が**そこで逆走する**。シーンは `sortScenes` が
   `timeSeconds` で並べているので、**隊形の並びそのものが入れ替わる**。
   警告では済まないので、操作の側で止める（速さの方が頭打ちになる）。
   ──────────────────────────────────────────────────────────── */

/** その拍を含む区間の番号 */
export function sectionIndexAtBeat(
  placements: readonly Placement[],
  beat: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  let found = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].fromBeat <= beat) found = i;
    else break;
  }
  return found;
}

/**
 * その区間が終わる拍。次の区切りがあればそこ、無ければ振付の最後。
 *
 * @param lastBeat いちばん後ろのシーンの拍
 */
export function sectionEndBeat(
  placements: readonly Placement[],
  index: number,
  lastBeat: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const next = list[index + 1];
  if (next) return next.fromBeat;

  const from = list[index]?.fromBeat ?? 0;
  // 最後のシーンより後ろに区切りを置くと、拍数は0（伸縮しようがない）
  return Number.isFinite(lastBeat) ? Math.max(from, lastBeat) : from;
}

/**
 * その区間の最後の拍が鳴る秒。
 *
 * ⚠️ **`secondsAtBeat` を通さない。** あちらは区間の境目の拍を**次の区間**で
 * 写す（`fromBeat <= beat` で後ろを採る）ので、境目では常に次の区切りの秒を
 * 返してしまう。ここが知りたいのは「この区間自身の速さで測ると、どこまで
 * 伸びているか」の方。
 */
export function sectionEndSeconds(
  placements: readonly Placement[],
  index: number,
  lastBeat: number,
): number {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const current = list[index];
  if (!current) return 0;

  const beats = Math.max(
    0,
    sectionEndBeat(list, index, lastBeat) - current.fromBeat,
  );
  return current.atSeconds + beats * current.secondsPerBeat;
}

/**
 * その区間で許される1拍の最大の長さ。**次の区切りへ食い込ませないため。**
 *
 * 最後の区間には次が無いので上限は無い（`null`）。拍が1つも入っていない
 * 区間も、どんな速さでも食い込まないので `null`。
 */
export function maxSecondsPerBeatAt(
  placements: readonly Placement[],
  index: number,
  lastBeat: number,
): number | null {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const current = list[index];
  const next = list[index + 1];
  if (!current || !next) return null;

  const beats = sectionEndBeat(list, index, lastBeat) - current.fromBeat;
  if (beats <= 0) return null;
  return (next.atSeconds - current.atSeconds) / beats;
}

/** 速さを、上限・下限と「次の区切りへ食い込まない所」の両方で丸める */
function fitSecondsPerBeat(
  list: readonly Placement[],
  index: number,
  lastBeat: number,
  wanted: number,
): number {
  /* 速さの形（BPM）に直してから丸める。秒のまま丸めると、上限・下限の
     すぐ内側で「押しても動かない」帯ができる */
  const bounded = 60 / clampBpm(60 / Math.max(1e-6, wanted));
  const max = maxSecondsPerBeatAt(list, index, lastBeat);
  if (max !== null && max > 0 && bounded > max) return max;
  return bounded;
}

/**
 * **区切りを増やす。置いた瞬間、秒は1つも動かない。**
 *
 * 新しい区間の頭の秒は「いまの式で出した秒」そのもの、1拍の長さは直前と
 * 同じ。代入すると `at + (b − from) × spb` が前後で完全に一致するので、
 * **どのシーンも動かない**。動かすのはこの後、その区間だけ速さや頭を
 * 引いたとき。1曲目には波及しない。
 *
 * ⚠️ **ここでは丸めない。** `moveSectionTo` が丸めるのは人が引いた秒を
 * 受けるから。こちらは既にある値から掛けて足しただけで、丸めると
 * 「置くだけでは動かない」という約束が最大0.5ミリ秒ぶん崩れる。
 */
export function splitAt(
  placements: readonly Placement[],
  beat: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!Number.isFinite(beat)) return [...list];
  // 先頭は必ず拍0から始まっている。そこは既に区切り
  if (beat <= 0) return [...list];
  // 同じ拍に2つ置かない（`normalizePlacements` と同じ理由）
  if (list.some((item) => sameBeat(item.fromBeat, beat))) return [...list];

  const index = sectionIndexAtBeat(list, beat);
  const added: Placement = {
    fromBeat: beat,
    atSeconds: secondsAtBeat(list, beat),
    secondsPerBeat: list[index].secondsPerBeat,
  };
  return [...list.slice(0, index + 1), added, ...list.slice(index + 1)];
}

/**
 * **区切りを外す。** 後ろの区間は手前の式に吸収されるので、**そこの秒は
 * 動く**（それが「2つを1つの曲に戻す」ということ）。
 *
 * 先頭（拍0）は外せない。外すと写せない拍ができる。
 *
 * ⚠️ 吸収した結果、手前の区間が**その次の区切りへ食い込む**ことがある。
 * そのときだけ、手前の速さを食い込まない所まで詰める。
 */
export function mergeAt(
  placements: readonly Placement[],
  index: number,
  lastBeat: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!Number.isInteger(index) || index <= 0 || index >= list.length) {
    return [...list];
  }

  const merged = [...list.slice(0, index), ...list.slice(index + 1)];
  return restretchAt(
    merged,
    index - 1,
    merged[index - 1].secondsPerBeat,
    lastBeat,
  );
}

/** 区間に名前を付ける。空白だけなら名前を外す */
export function renameSection(
  placements: readonly Placement[],
  index: number,
  label: string,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!list[index]) return [...list];

  const next = normalizeLabel(label);
  return list.map((item, i) => {
    if (i !== index) return item;
    const renamed: Placement = {
      fromBeat: item.fromBeat,
      atSeconds: item.atSeconds,
      secondsPerBeat: item.secondsPerBeat,
    };
    return next === null ? renamed : { ...renamed, label: next };
  });
}

/**
 * **その区間だけ速さを変える。** 他の区間の頭の秒は動かさない。
 *
 * 次の区切りの `atSeconds` は「次の曲が鳴り始める秒」＝**曲の側の事実**な
 * ので、手前の速さをいじって動いてはいけない。動かすと、直した覚えの無い
 * 2曲目が音からずれる。代わりに**速さの方が止まる**。
 */
export function restretchAt(
  placements: readonly Placement[],
  index: number,
  nextSecondsPerBeat: number,
  lastBeat: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  if (!list[index]) return [...list];
  if (!Number.isFinite(nextSecondsPerBeat) || nextSecondsPerBeat <= 0) {
    return [...list];
  }

  const fitted = fitSecondsPerBeat(list, index, lastBeat, nextSecondsPerBeat);
  return list.map((item, i) =>
    i === index ? { ...item, secondsPerBeat: fitted } : item,
  );
}

/**
 * **その区間の頭を、曲のこの秒へ置く。** 速さと、他の区間は動かさない。
 *
 * 動ける範囲は両隣で決まる。
 *   手前 … 手前の区間の最後の拍が鳴り終わる秒（そこより前へは行けない）
 *   後ろ … 自分の最後の拍が、次の区切りに届く所まで
 *
 * 先頭の区間は負の秒へ置けない（曲が始まる前に振付は始まらない）。
 */
export function moveSectionTo(
  placements: readonly Placement[],
  index: number,
  atSeconds: number,
  lastBeat: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const current = list[index];
  if (!current || !Number.isFinite(atSeconds)) return [...list];

  const lower = index > 0 ? sectionEndSeconds(list, index - 1, lastBeat) : 0;

  const next = list[index + 1];
  const beats = Math.max(
    0,
    sectionEndBeat(list, index, lastBeat) - current.fromBeat,
  );
  const upper = next
    ? next.atSeconds - beats * current.secondsPerBeat
    : Number.POSITIVE_INFINITY;

  const clamped = Math.min(Math.max(atSeconds, lower), Math.max(lower, upper));
  return list.map((item, i) =>
    i === index ? { ...item, atSeconds: roundSeconds(clamped) } : item,
  );
}

/**
 * **その区間の終わりを、この秒へ合わせる。** 頭は動かさない。
 *
 * バーの右の取っ手を引く操作。区間の最後の拍が `endSeconds` に来るような
 * 1拍の長さを出して伸縮させる。上限・下限と、次の区切りで止まる。
 */
export function stretchSectionToEnd(
  placements: readonly Placement[],
  index: number,
  lastBeat: number,
  endSeconds: number,
): Placement[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  const current = list[index];
  if (!current || !Number.isFinite(endSeconds)) return [...list];

  const beats = sectionEndBeat(list, index, lastBeat) - current.fromBeat;
  // 拍が1つも入っていない区間は伸縮しようがない
  if (beats <= 0) return [...list];

  /* **頭より左へ引いても潰さない。** 取っ手を頭より前まで引くのは
     「できるだけ短く」という手つきなので、いちばん速い所で止める。

     ⚠️ ここで底を入れるのは、`restretchAt` が 0以下の速さを
     **何もしない**で弾くため。あちらは「速さ」を受け取る口で、0 は
     打ち間違いとして無視するのが正しい。こちらは「引いた位置」を
     受け取る口なので、同じ値でも意味が違う。 */
  const wanted = (endSeconds - current.atSeconds) / beats;
  return restretchAt(list, index, Math.max(1e-6, wanted), lastBeat);
}

/** 画面へ出すための、区間ひとつぶんのまとめ */
export type Section = {
  index: number;
  /** 始まりの拍 */
  fromBeat: number;
  /** 終わりの拍（次の区切り、無ければ振付の最後） */
  toBeat: number;
  /** 始まりの秒（＝その曲が鳴り始める秒） */
  fromSeconds: number;
  /** 最後の拍が鳴る秒。**次の区切りより手前で終わることがある**（間奏） */
  toSeconds: number;
  secondsPerBeat: number;
  bpm: number;
  label?: string;
};

/**
 * 区間の一覧。**時間軸へバーを描く側と、一覧に並べる側が同じものを読む。**
 *
 * 各画面で条件を書き直すと、必ずどこかが取り残される
 * （`.claude/rules/state.md` 6節）。
 */
/**
 * その秒が入っている区間の番号。
 *
 * ■ 何に要るか（2026-09-25）
 * 区切りごとに再生ボタンを置くと、**どの行がいま鳴っているのか**を
 * 行ごとに言えなければならない。作品全体の `isPlaying` を配ると、
 * **どの行のボタンも一斉に「止める」に変わる**（user の報告
 * 「どちらのボタンも反応してしまう」）。
 *
 * ■ 端の扱い
 * - 最初の区間より**手前**（音先で、まだ振付が始まっていない間）… `0`。
 *   向かっている先がその区間なので、そこが「いまの行」でよい
 * - 最後の区間より**後ろ**（振付が終わっても曲が続く間）… 最後の番号。
 *   `toSeconds` で切ると、**どの行でもない時間**ができてボタンが
 *   ちらつく
 *
 * だから見るのは `fromSeconds` だけ。**区間は隙間なく並んでいる**ので、
 * 「その秒を過ぎた最後の区間」で必ず1つに決まる。
 */
export function sectionIndexAtSeconds(
  list: readonly Section[],
  seconds: number,
): number {
  if (list.length === 0) return 0;

  let index = 0;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].fromSeconds <= seconds) index = i;
    else break;
  }
  return index;
}

export function sections(
  placements: readonly Placement[],
  lastBeat: number,
): Section[] {
  const list = placements.length > 0 ? placements : DEFAULT_PLACEMENTS;
  return list.map((item, index) => {
    const section: Section = {
      index,
      fromBeat: item.fromBeat,
      toBeat: sectionEndBeat(list, index, lastBeat),
      fromSeconds: item.atSeconds,
      toSeconds: sectionEndSeconds(list, index, lastBeat),
      secondsPerBeat: item.secondsPerBeat,
      bpm: clampBpm(60 / item.secondsPerBeat),
    };
    return item.label === undefined
      ? section
      : { ...section, label: item.label };
  });
}
