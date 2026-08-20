/**
 * アプリ全体の設定。端末に覚える(localStorage)。
 *
 * ■ なぜ端末なのか
 * ここに並ぶのは「どう作りたいか」であって、作品の中身ではない。
 * 同じ作品を別の人が開いたときに、相手の手癖まで付いてくるのは困る。
 * 作品が持つ値(BPM・拍子・曲の頭出し・ステージの広さ)は projects の列にあり、
 * この設定が決めるのは【新しく作るときの初期値】だけ。
 *
 * ■ 効く範囲は2段(2026-08-17)
 * 「ホームで変えたら全部の作品へ、作品を開いた状態で変えたらその作品だけ」
 * という要望を受けて、**土台(base)＋作品ごとの上書き(byProject)** の形にした。
 * 上書きできるのは「その作品でどう見たいか」に当たるものだけで、
 * 新しく作るときの初期値(ステージの広さ・既定の速さ)と、アプリの決めごと
 * (自動保存)は土台にしか持たない — 作品ごとに変えても効く先が無いため。
 *
 * ■ 外部入力として扱う
 * localStorage は書き換えられる。知っている値だけを通し、それ以外は
 * 既定へ落とす(themePreference / viewPreference と同じ作法)。
 */

import {
  DEFAULT_DANCER_SORT,
  isDancerSort,
  type DancerSort,
} from "@/features/dancer/lib/dancerOrder";

/** ダンサー名の出し方 */
export type DancerNameDisplay = "always" | "selected" | "never";
const DANCER_NAME_DISPLAYS: DancerNameDisplay[] = [
  "always",
  "selected",
  "never",
];

/** 再生前に鳴らす予備拍。0 なら鳴らさない */
export type CountIn = 0 | 4 | 8;
const COUNT_INS: CountIn[] = [0, 4, 8];

export const SETTINGS_STORAGE_KEY = "choreon.settings.v1";

export type Settings = {
  // --- 舞台・キャンバス ---
  /**
   * 客席を上に置く(＝前後を入れ替えて見る)。
   *
   * **保存されている座標は動かさない。** 描くときに上下を鏡にするだけで、
   * 「前」「奥」という言葉と、ダンサーの向きの既定も一緒に反転する。
   * データを触ると、同じ作品を既定の向きで開いた人と食い違う。
   */
  isAudienceOnTop: boolean;
  /** 新しい作品のステージの広さ(1マス=90cm) */
  /** ドラッグを格子へ吸着させるか */
  isSnapEnabled: boolean;
  /** センターライン(0の列)を強調するか */
  isCenterLineVisible: boolean;

  // --- 再生・タイムライン ---
  /** 再生の前に鳴らす予備拍 */
  countIn: CountIn;
  /** 曲が無いときのメトロノームの既定の速さ(新しい作品に入る値) */
  defaultBpm: number;
  /** 新しいシーンを、いまのシーンから何秒後に置くか */
  defaultSegmentSeconds: number;

  // --- 表示 ---
  /**
   * ダンサー名の出し方。
   *
   * 「導線」「バミリ」「顔被り」などのモードはここに持たない。あれらは
   * 既に viewPreference が端末へ覚えていて(useUIStore)、エディタの
   * 「表示とモード」から切り替えられる。同じ状態を2箇所で持つと、
   * どちらが正なのか決まらなくなる。設定画面はその同じスイッチを
   * もう一つの入口として並べているだけ。
   */
  dancerNameDisplay: DancerNameDisplay;
  /** 一覧に並べるダンサーの順。並べ替えるのは見た目だけで、保存は動かない */
  dancerSort: DancerSort;

  // --- アプリ ---
  /** 触るたびに保存するか。切ると、保存は手で押したときだけになる */
  isAutoSaveEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  isAudienceOnTop: false,
  isSnapEnabled: true,
  isCenterLineVisible: true,
  countIn: 0,
  defaultBpm: 120,
  defaultSegmentSeconds: 4,
  dancerNameDisplay: "always",
  dancerSort: DEFAULT_DANCER_SORT,
  isAutoSaveEnabled: true,
};

/**
 * ステージの広さの範囲。狭すぎると隊形が組めず、広すぎると点が潰れる。
 *
 * 下限は 6 マス(5.4m)だったが、「2 くらいまで下げたい」という声を受けて
 * **4 マス(3.6m)** にした。2 マスまで許すと 2×2 の格子＝置ける場所が
 * 4 つしかなく、ダンサーが3人いる時点で隊形にならない。稽古場の
 * いちばん狭い区画がだいたい 3.6m 四方なので、そこを底にしている。
 */
/**
 * 新しい作品の広さ。**設定ではなく定数**にした（2026-08-20）。
 *
 * 作るときの板でその場で決めるようになったので、別の画面に「初期値」を
 * 置いておく意味が無くなった。ここは板の出発点と、読み込み中の骨組みが
 * 使う。実寸では 12.6m × 9m ほど（1ユニット = 約90cm）。
 * 幅を偶数にしているのは、奇数だと中心が格子点の間に来るため。
 */
export const DEFAULT_STAGE_WIDTH = 14;
export const DEFAULT_STAGE_HEIGHT = 10;

export const MIN_STAGE_UNITS = 4;
export const MAX_STAGE_UNITS = 30;
/** シーンの間隔。0.1未満だと2つのシーンが同じ時刻に重なる */
export const MIN_SEGMENT_SETTING = 0.5;
export const MAX_SEGMENT_SETTING = 16;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;

  const record = parsed as Record<string, unknown>;
  return {
    isAudienceOnTop: boolean(
      record.isAudienceOnTop,
      DEFAULT_SETTINGS.isAudienceOnTop,
    ),
    isSnapEnabled: boolean(
      record.isSnapEnabled,
      DEFAULT_SETTINGS.isSnapEnabled,
    ),
    isCenterLineVisible: boolean(
      record.isCenterLineVisible,
      DEFAULT_SETTINGS.isCenterLineVisible,
    ),
    countIn: COUNT_INS.includes(record.countIn as CountIn)
      ? (record.countIn as CountIn)
      : DEFAULT_SETTINGS.countIn,
    defaultBpm: clampInt(
      record.defaultBpm,
      40,
      240,
      DEFAULT_SETTINGS.defaultBpm,
    ),
    defaultSegmentSeconds: clampNumber(
      record.defaultSegmentSeconds,
      MIN_SEGMENT_SETTING,
      MAX_SEGMENT_SETTING,
      DEFAULT_SETTINGS.defaultSegmentSeconds,
    ),
    dancerNameDisplay: DANCER_NAME_DISPLAYS.includes(
      record.dancerNameDisplay as DancerNameDisplay,
    )
      ? (record.dancerNameDisplay as DancerNameDisplay)
      : DEFAULT_SETTINGS.dancerNameDisplay,
    dancerSort: isDancerSort(record.dancerSort)
      ? record.dancerSort
      : DEFAULT_SETTINGS.dancerSort,
    isAutoSaveEnabled: boolean(
      record.isAutoSaveEnabled,
      DEFAULT_SETTINGS.isAutoSaveEnabled,
    ),
  };
}

/**
 * 作品ごとに変えられる項目。
 *
 * ここに無いものは、作品を開いた状態で変えても土台へ書く:
 * - `defaultBpm` … **新しく作るときの初期値**。既にある作品には元から効かない
 *   （広さは設定から外し、作るときの板で決める形にした。2026-08-20）
 * - `isAutoSaveEnabled` … この端末の決めごと。作品ごとに切り替えると
 *   「どの作品を開いていたか」で保存の挙動が変わり、事故になる
 */
export const PROJECT_SCOPED_KEYS = [
  "isAudienceOnTop",
  "isSnapEnabled",
  "isCenterLineVisible",
  "countIn",
  "defaultSegmentSeconds",
  "dancerNameDisplay",
  "dancerSort",
] as const satisfies readonly (keyof Settings)[];

export type ProjectScopedKey = (typeof PROJECT_SCOPED_KEYS)[number];

export function isProjectScopedKey(
  key: keyof Settings,
): key is ProjectScopedKey {
  return (PROJECT_SCOPED_KEYS as readonly string[]).includes(key);
}

/** 端末に書いてある形。土台と、作品ごとの上書き */
export type StoredSettings = {
  base: Settings;
  byProject: Record<string, Partial<Settings>>;
};

/**
 * 保存されている文字列を読む。
 *
 * **古い形(Settings がそのまま入っているもの)も読む。** 2階層にする前から
 * 使っている人の設定を、更新した瞬間に既定へ戻さないため。
 */
export function parseStoredSettings(raw: string | null): StoredSettings {
  const empty: StoredSettings = { base: DEFAULT_SETTINGS, byProject: {} };
  if (!raw) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== "object" || parsed === null) return empty;

  const record = parsed as Record<string, unknown>;
  // 新しい形かどうかは base の有無で決まる。古い形はここが無い
  const hasBase = typeof record.base === "object" && record.base !== null;
  const base = parseSettings(JSON.stringify(hasBase ? record.base : record));

  const byProject: Record<string, Partial<Settings>> = {};
  const stored = record.byProject;
  if (typeof stored === "object" && stored !== null) {
    for (const [projectId, value] of Object.entries(
      stored as Record<string, unknown>,
    )) {
      if (typeof value !== "object" || value === null) continue;
      // 上書きも外部入力。**まず土台に重ねて丸めてから**、
      // 実際に入っていたキーだけを取り出す。こうすると範囲外の数や
      // 知らない文字列が、土台と同じ規則で直る
      const merged = parseSettings(JSON.stringify({ ...base, ...value }));
      const partial: Partial<Settings> = {};
      for (const key of PROJECT_SCOPED_KEYS) {
        if (key in (value as Record<string, unknown>)) {
          // 型の穴を開けずに1つずつ写す
          Object.assign(partial, { [key]: merged[key] });
        }
      }
      if (Object.keys(partial).length > 0) byProject[projectId] = partial;
    }
  }

  return { base, byProject };
}

/** 土台に、その作品の上書きを重ねた結果。上書きが無ければ土台そのもの */
export function resolveSettings(
  base: Settings,
  override: Partial<Settings> | undefined,
): Settings {
  return override ? { ...base, ...override } : base;
}

export function loadStoredSettings(): StoredSettings {
  try {
    return parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
  } catch {
    return { base: DEFAULT_SETTINGS, byProject: {} };
  }
}

export function saveStoredSettings(stored: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // プライベートモード等。今の画面はそのまま動き、次回に残らないだけ
  }
}
