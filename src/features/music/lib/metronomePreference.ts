/**
 * メトロノームの設定を端末に覚えておくための入れ物。
 *
 * 【プロジェクトごと】に持つ。BPMは端末の好みではなく、その作品が乗る曲の
 * 速さなので、別の作品を開いたら別の値でなければならない。
 * (見た目の設定が端末ごと、曲の頭出しが作品ごと、なのと同じ切り分け)
 *
 * クラウドではなく端末に置いているのは、DBの列を増やさずに済ませるため。
 * ここが端末どまりだと、別の端末で開いたときにBPMを入れ直すことになる。
 * それが不便だと分かった時点で projects の列へ移す(そのときは
 * music_offset_seconds と同じ扱いになる)。
 *
 * 保存の作法は viewPreference / themePreference と揃えている。
 * localStorage の中身は書き換えられる外部入力なので、読むときに必ず検証し、
 * 知らない値は既定に落とす。
 */

/** よくある速さ。振付で使う曲はおおむね 60〜200 に収まる */
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 120;

/**
 * 端末に覚えるのは【鳴らすかどうか】だけ。
 *
 * 速さ(BPM)は作品が持つ(projects.bpm)。曲が無いときの時間の物差しに
 * なったので、端末どまりだと共有された相手の画面でカウントが引けない。
 * 鳴らすかどうかは、その場に居る人の都合(稽古場か電車か)なので端末の好み。
 */
export type MetronomeSetting = {
  isEnabled: boolean;
};

export const DEFAULT_METRONOME_SETTING: MetronomeSetting = {
  isEnabled: false,
};

/** localStorageのキー。値の形を変えるときはここも変えて、古い形を無視させる */
export const METRONOME_STORAGE_KEY = "choreon.metronome.v1";

/** プロジェクトIDごとの設定をまとめて持つ */
type Stored = Record<string, MetronomeSetting>;

function parseAll(raw: string | null): Stored {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};

  const result: Stored = {};
  for (const [projectId, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (typeof value !== "object" || value === null) continue;
    const record = value as Record<string, unknown>;
    result[projectId] = {
      isEnabled:
        typeof record.isEnabled === "boolean" ? record.isEnabled : false,
    };
  }
  return result;
}

export function loadMetronomeSetting(projectId: string): MetronomeSetting {
  try {
    const all = parseAll(localStorage.getItem(METRONOME_STORAGE_KEY));
    return all[projectId] ?? DEFAULT_METRONOME_SETTING;
  } catch {
    // プライベートモード等でlocalStorage自体が触れない。既定のまま動かす
    return DEFAULT_METRONOME_SETTING;
  }
}

export function saveMetronomeSetting(
  projectId: string,
  setting: MetronomeSetting,
): void {
  try {
    const all = parseAll(localStorage.getItem(METRONOME_STORAGE_KEY));
    all[projectId] = setting;
    localStorage.setItem(METRONOME_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 書けなくても今の画面はそのまま動かす(次回に残らないだけ)
  }
}

/** 入力欄から来た値を、扱える範囲へ収める */
export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}
