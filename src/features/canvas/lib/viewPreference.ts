/**
 * 「表示とモード」で選んだ見え方を端末に覚えておくための入れ物。
 *
 * ここに入れているのは目盛りと導線の2つだけ。どちらも
 * 「今どう見たいか」であって、作品の中身ではない。だからプロジェクトでも
 * クラウドでもなく端末に持たせている(見た目の設定と同じ考え方)。
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
  /** ステージを横に払ってシーンを送る操作を受け付けるか。
   * マウスでは「掴んで動かす」より場所を取る操作になってしまうので、
   * 指のある端末だけ既定でオンにする(defaultViewPreference参照) */
  isSwipeSceneChangeEnabled: boolean;
};

export const DEFAULT_VIEW_PREFERENCE: ViewPreference = {
  gridMode: "square",
  isPathVisible: false,
  isSwipeSceneChangeEnabled: false,
};

/**
 * まだ何も保存されていない端末での初期値。
 *
 * スワイプでのシーン送りだけは、端末によって「あると助かる」「邪魔になる」が
 * はっきり分かれる。指で払うのが自然なタッチ端末では既定でオンにし、
 * マウスでは既定でオフにする。どちらも設定から変えられる。
 */
export function defaultViewPreference(): ViewPreference {
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  return {
    ...DEFAULT_VIEW_PREFERENCE,
    isSwipeSceneChangeEnabled: isCoarsePointer,
  };
}

/**
 * 保存されている文字列を読む。
 *
 * localStorageの中身は書き換えられる可能性がある外部入力なので、
 * 知っている値だけを通し、それ以外は既定に落とす。
 */
export function parseViewPreference(raw: string | null): ViewPreference {
  const fallback = defaultViewPreference();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return fallback;
  }

  const record = parsed as Record<string, unknown>;
  return {
    gridMode: isGridMode(record.gridMode) ? record.gridMode : fallback.gridMode,
    isPathVisible:
      typeof record.isPathVisible === "boolean"
        ? record.isPathVisible
        : fallback.isPathVisible,
    isSwipeSceneChangeEnabled:
      typeof record.isSwipeSceneChangeEnabled === "boolean"
        ? record.isSwipeSceneChangeEnabled
        : fallback.isSwipeSceneChangeEnabled,
  };
}
