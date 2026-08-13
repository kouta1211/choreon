/**
 * アプリ全体の設定。端末に覚える(localStorage)。
 *
 * ■ なぜ端末なのか
 * ここに並ぶのは「どう作りたいか」であって、作品の中身ではない。
 * 同じ作品を別の人が開いたときに、相手の手癖まで付いてくるのは困る。
 * 作品が持つ値(BPM・拍子・曲の頭出し・ステージの広さ)は projects の列にあり、
 * この設定が決めるのは【新しく作るときの初期値】だけ。
 *
 * ■ 外部入力として扱う
 * localStorage は書き換えられる。知っている値だけを通し、それ以外は
 * 既定へ落とす(themePreference / viewPreference と同じ作法)。
 */

/** ダンサー名の出し方 */
export type DancerNameDisplay = "always" | "selected" | "never";
const DANCER_NAME_DISPLAYS: DancerNameDisplay[] = [
  "always",
  "selected",
  "never",
];

/** アプリ全体の明るさ。10種のテーマとは別の、粗い選択 */
export type ColorScheme = "dark" | "light" | "system";
const COLOR_SCHEMES: ColorScheme[] = ["dark", "light", "system"];

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
  defaultStageWidth: number;
  defaultStageHeight: number;
  /** 格子を何マスおきに引くか。1なら全部、2なら1本おき */
  gridInterval: number;
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

  // --- アプリ ---
  colorScheme: ColorScheme;
  /** 触るたびに保存するか。切ると、保存は手で押したときだけになる */
  isAutoSaveEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  isAudienceOnTop: false,
  defaultStageWidth: 14,
  defaultStageHeight: 10,
  gridInterval: 1,
  isSnapEnabled: true,
  isCenterLineVisible: true,
  countIn: 0,
  defaultBpm: 120,
  defaultSegmentSeconds: 4,
  dancerNameDisplay: "always",
  colorScheme: "dark",
  isAutoSaveEnabled: true,
};

/** ステージの広さの範囲。狭すぎると隊形が組めず、広すぎると点が潰れる */
export const MIN_STAGE_UNITS = 6;
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
    defaultStageWidth: clampInt(
      record.defaultStageWidth,
      MIN_STAGE_UNITS,
      MAX_STAGE_UNITS,
      DEFAULT_SETTINGS.defaultStageWidth,
    ),
    defaultStageHeight: clampInt(
      record.defaultStageHeight,
      MIN_STAGE_UNITS,
      MAX_STAGE_UNITS,
      DEFAULT_SETTINGS.defaultStageHeight,
    ),
    gridInterval: clampInt(record.gridInterval, 1, 4, DEFAULT_SETTINGS.gridInterval),
    isSnapEnabled: boolean(record.isSnapEnabled, DEFAULT_SETTINGS.isSnapEnabled),
    isCenterLineVisible: boolean(
      record.isCenterLineVisible,
      DEFAULT_SETTINGS.isCenterLineVisible,
    ),
    countIn: COUNT_INS.includes(record.countIn as CountIn)
      ? (record.countIn as CountIn)
      : DEFAULT_SETTINGS.countIn,
    defaultBpm: clampInt(record.defaultBpm, 40, 240, DEFAULT_SETTINGS.defaultBpm),
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
    colorScheme: COLOR_SCHEMES.includes(record.colorScheme as ColorScheme)
      ? (record.colorScheme as ColorScheme)
      : DEFAULT_SETTINGS.colorScheme,
    isAutoSaveEnabled: boolean(
      record.isAutoSaveEnabled,
      DEFAULT_SETTINGS.isAutoSaveEnabled,
    ),
  };
}

export function loadSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // プライベートモード等。今の画面はそのまま動き、次回に残らないだけ
  }
}
