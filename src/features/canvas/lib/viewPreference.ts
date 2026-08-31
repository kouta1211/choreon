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

/**
 * 作品ごとの選択を書くキー。
 *
 * **土台とは別のキーに分けてある。** 1つのキーに入れ子で持つと、
 * 作品を1つ触るたびに全部の作品ぶんを読んで書き直すことになり、
 * どこか1件の中身が壊れたときに全部が既定へ落ちる。
 * 分けておけば、壊れた作品だけが土台へ戻る。
 */
export function projectViewKey(projectId: string): string {
  return `${VIEW_STORAGE_KEY}:${projectId}`;
}

export type ViewPreference = {
  gridMode: GridMode;
  isPathVisible: boolean;
  /** バミリ(全シーンの立ち位置を床に重ねた印)を出すか */
  isStageMarksVisible: boolean;
  /** 客席から見えなくなる人(顔被り)を警告するか */
  isBlindSpotCheckVisible: boolean;
  /**
   * 移動中にぶつかる組み合わせを警告するか。
   *
   * ⚠️ **以前は導線(isPathVisible)に相乗りしていた**（2026-09-01 に分けた）。
   * 判定は導線と同じ経路を使うが、user から見れば別の機能で、
   * 「線を消したら警告も消えた」は説明が付かない。
   */
  isCollisionCheckVisible: boolean;
  /**
   * 歩いて間に合わない速さの移動を警告するか。
   *
   * ⚠️ **切るのは表示だけ。** AI の講評(features/review)とアシストの提案
   * (features/assist)は、この設定に関わらず今までどおり見る。
   * 一緒に切ると、印を消しただけのつもりで**AI が問題を見落とす**。
   */
  isMoveStrainCheckVisible: boolean;
  /** ステージを払ってシーンを送る操作を受け付けるか。
   * マウスでは「掴んで動かす」より場所を取る操作になってしまうので、
   * 指のある端末だけ既定でオンにする(defaultViewPreference参照) */
  /**
   * 下端の時間軸(曲とシーンの帯)を出すか。
   *
   * PCでは帯が画面の1/4ほどを占め、そのぶんステージが小さくなる。
   * シーンは左右のペインにも並んでいるので、時間の並びが要らないときは
   * 畳めた方がステージを広く使える、という指摘を受けて足した。
   */
  isTimelineVisible: boolean;
};

export const DEFAULT_VIEW_PREFERENCE: ViewPreference = {
  gridMode: "square",
  isPathVisible: false,
  isStageMarksVisible: false,
  isBlindSpotCheckVisible: false,
  /* **警告は既定で出す。** これまでの見え方をそのまま引き継ぐ
     （速すぎる移動は常時オンだった）。要らない人が切る、という向き */
  isCollisionCheckVisible: true,
  isMoveStrainCheckVisible: true,
  isTimelineVisible: true,
};

/**
 * まだ何も保存されていない端末での初期値。
 *
 * 以前はここで「指で払うのが自然な端末か」を見て、払ってのシーン送りだけ
 * 既定を分けていた。**その操作は狭い幅（スマホ）専用で、その幅では作る
 * 画面に入れなくなった**ので、丸ごと畳んだ（2026-08-20）。
 */
export function defaultViewPreference(): ViewPreference {
  return { ...DEFAULT_VIEW_PREFERENCE };
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
    isStageMarksVisible:
      typeof record.isStageMarksVisible === "boolean"
        ? record.isStageMarksVisible
        : fallback.isStageMarksVisible,
    isBlindSpotCheckVisible:
      typeof record.isBlindSpotCheckVisible === "boolean"
        ? record.isBlindSpotCheckVisible
        : fallback.isBlindSpotCheckVisible,
    isCollisionCheckVisible:
      typeof record.isCollisionCheckVisible === "boolean"
        ? record.isCollisionCheckVisible
        : fallback.isCollisionCheckVisible,
    isMoveStrainCheckVisible:
      typeof record.isMoveStrainCheckVisible === "boolean"
        ? record.isMoveStrainCheckVisible
        : fallback.isMoveStrainCheckVisible,
    isTimelineVisible:
      typeof record.isTimelineVisible === "boolean"
        ? record.isTimelineVisible
        : fallback.isTimelineVisible,
  };
}
