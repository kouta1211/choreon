/**
 * 「表示とモード」で選んだ見え方を端末に覚えておくための入れ物。
 *
 * ここに入れているのは目盛り・導線・顔被りチェックの3つだけ。どれも
 * 「今どう見たいか」であって、作品の中身ではない。だからプロジェクトでも
 * クラウドでもなく端末に持たせている(見た目の設定と同じ考え方)。
 *
 * シンメトリーモードは入れていない。あれは表示ではなく編集の挙動を変える
 * もので、覚えたまま次に開くと「1人動かしたらもう1人も動いた」が
 * 説明なしに起きてしまうため、毎回オフから始める方が安全。
 *
 * ■ なぜ覚える必要があるのか
 * 顔被りチェックは、オンにしても再読み込みやプロジェクトを開き直すたびに
 * オフへ戻っていた。判定そのものは動いていても、確かめようとした時には
 * 消えているので「効いていない」ようにしか見えない。
 */

/** ステージの目盛りの出し方。円形の隊形は格子より同心円の方が読みやすい */
export type GridMode = "square" | "circle" | "none";

const GRID_MODES: GridMode[] = ["square", "circle", "none"];

export function isGridMode(value: unknown): value is GridMode {
  return GRID_MODES.includes(value as GridMode);
}

/** localStorageのキー。値の形を変えるときはここも変えて、古い形を無視させる */
export const VIEW_STORAGE_KEY = "choreon.view.v1";

export type ViewPreference = {
  gridMode: GridMode;
  isPathVisible: boolean;
  isBlindSpotCheckVisible: boolean;
};

export const DEFAULT_VIEW_PREFERENCE: ViewPreference = {
  gridMode: "square",
  isPathVisible: false,
  isBlindSpotCheckVisible: false,
};

/**
 * 保存されている文字列を読む。
 *
 * localStorageの中身は書き換えられる可能性がある外部入力なので、
 * 知っている値だけを通し、それ以外は既定に落とす。
 */
export function parseViewPreference(raw: string | null): ViewPreference {
  if (!raw) return DEFAULT_VIEW_PREFERENCE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_VIEW_PREFERENCE;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return DEFAULT_VIEW_PREFERENCE;
  }

  const record = parsed as Record<string, unknown>;
  return {
    gridMode: isGridMode(record.gridMode)
      ? record.gridMode
      : DEFAULT_VIEW_PREFERENCE.gridMode,
    isPathVisible:
      typeof record.isPathVisible === "boolean"
        ? record.isPathVisible
        : DEFAULT_VIEW_PREFERENCE.isPathVisible,
    isBlindSpotCheckVisible:
      typeof record.isBlindSpotCheckVisible === "boolean"
        ? record.isBlindSpotCheckVisible
        : DEFAULT_VIEW_PREFERENCE.isBlindSpotCheckVisible,
  };
}
