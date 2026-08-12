import { create } from "zustand";
import {
  DEFAULT_VIEW_PREFERENCE,
  parseViewPreference,
  VIEW_STORAGE_KEY,
  type GridMode,
  type ViewPreference,
} from "@/features/canvas/lib/viewPreference";

type Toast = {
  message: string;
  type: "success" | "error";
  /** 右端に出す1つだけの操作。失敗なら「再試行」、取り消せる操作なら
   * 「元に戻す」。知らせて終わりにせず、その場で次の一手を出す */
  action?: { label: string; onAction: () => void };
};

/** ドラッグ中、格子スナップが効いている格子線の位置(ステージ座標系の整数)。
 * 効いていない軸はnull。両方non-nullなら交差点にスナップしていることを表す */
type DragSnapLine = {
  x: number | null;
  y: number | null;
};

/** 取り消せない操作の前に出す確認ダイアログの中身。
 * window.confirm()の置き換えで、ブラウザ標準では書けなかった
 * 「一緒に何が消えるのか」を具体的に示せるようにしている */
export type ConfirmRequest = {
  title: string;
  description?: string;
  /** 巻き添えで消えるものを数で示すチップ(「12 シーン」「48 配置」など) */
  meta?: string[];
  /** 実行ボタンの文言。省略時は「削除する」 */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

/** ステージの目盛りの出し方。円形の隊形は格子より同心円の方が読みやすい。
 * 定義は端末に保存する側(viewPreference)に置いてある */
export type { GridMode };

type UIState = {
  selectedSceneId: string | null;
  /** 直前に選択していたシーン。「どこから来たか」が分かると、隣のシーンへの
   * 移動が「進んだ」のか「戻った」のかを判定できる。曲線の制御点と遷移時間は
   * 区間(前のシーン↔次のシーン)ごとに1つで、後ろ側のシーンのpositionに
   * 保存されているため、戻るときはそちらを見に行く必要がある
   * (DancerLayerが読み取る) */
  previousSceneId: string | null;
  selectedDancerId: string | null;
  /** ステージに敷く目盛り。格子(1マス=約90cm)と同心円(中心からの距離と角度)は
   * 同じ「どこに立っているか」を別の読み方で示すもので、重ねると
   * どちらも読めなくなるため、並立ではなく1つを選ぶ */
  gridMode: GridMode;
  toast: Toast | null;
  /** 「マイ・フォーカス」で強調表示中のダンサー。シーンをまたいでも
   * 保持したいUI状態なので、シーン選択と同じくここに置く */
  focusedDancerId: string | null;
  /** オンの間、選択中シーン→次のシーンへの移動導線をステージ上に描画する */
  isPathVisible: boolean;
  /** バミリ(全シーンの立ち位置を床に重ねた印)を出すか */
  isStageMarksVisible: boolean;
  /** 客席から見えなくなる人(顔被り)を警告するか。移動中も含めて調べる */
  isBlindSpotCheckVisible: boolean;
  /** ステージを横に払ってシーンを送る操作を受け付けるか */
  isSwipeSceneChangeEnabled: boolean;
  /** シーン移動のアニメーションが進行中か。この間はダンサーを掴ませない
   * (掴むと、移動アニメーションとドラッグが同じ座標を取り合う) */
  isTransitioning: boolean;
  /** ドラッグ中の格子スナップ状態(CanvasBoardのonDragMoveが更新し、Stageが
   * 該当する格子線をハイライト表示するために読む) */
  dragSnapLine: DragSnapLine;
  /** シーンのタイムライン再生中かどうか(SceneTimelineの再生シーケンサーが
   * 読み書きする)。手動でシーンを選ぶと止まる */
  isPlaying: boolean;
  /** シーン一覧シート(並び替え・複製・削除)を開いているか */
  isSceneSheetOpen: boolean;
  /** ダンサー追加シートを開いているか */
  isAddDancerSheetOpen: boolean;
  /** フォーメーションのテンプレートシートを開いているか */
  isTemplateSheetOpen: boolean;
  /** 表示中の確認ダイアログ。nullなら出ていない */
  confirm: ConfirmRequest | null;
  /** 登録/ログインのモーダル。nullなら出ていない。
   * 画面遷移ではなくモーダルにしているのは、作りかけの作品を見たまま
   * 登録できるようにするため(「これを残したい」という気持ちが切れない) */
  authDialogMode: "login" | "signup" | null;

  selectScene: (sceneId: string | null) => void;
  selectDancer: (dancerId: string | null) => void;
  setGridMode: (mode: GridMode) => void;
  showToast: (toast: Toast) => void;
  clearToast: () => void;
  setFocusedDancer: (dancerId: string | null) => void;
  togglePathVisible: () => void;
  toggleStageMarks: () => void;
  toggleBlindSpotCheck: () => void;
  toggleSwipeSceneChange: () => void;
  setIsTransitioning: (isTransitioning: boolean) => void;
  setDragSnapLine: (line: DragSnapLine) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSceneSheetOpen: (isOpen: boolean) => void;
  setAddDancerSheetOpen: (isOpen: boolean) => void;
  setTemplateSheetOpen: (isOpen: boolean) => void;
  /** 確認ダイアログを出す。実行された場合の処理はrequest.onConfirmに持たせる */
  requestConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  openAuthDialog: (mode: "login" | "signup") => void;
  closeAuthDialog: () => void;
  /** 端末に覚えてある「表示とモード」の選択を読み込む。画面が出てから
   * 1回だけ呼ぶ(サーバー側にlocalStorageは無いので、描画前には読めない) */
  loadViewPreference: () => void;
};

/** 「表示とモード」の選択を端末へ書き戻す */
function persistViewPreference(preference: ViewPreference) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // プライベートモードや容量超過で書けないことがある。次回に残らない
    // だけなので、今の画面はそのまま動かす(見た目の設定と同じ扱い)
  }
}

/** いまの状態から保存する形を組み、変えた1項目だけを上書きして書き戻す。
 *
 * 以前は各setterが保存対象を1つずつ手で並べていた。覚える項目が増えるたびに
 * 全部のsetterへ足して回る必要があり、書き漏れたsetterを通ったときだけ
 * その項目が既定へ戻る、という気づきにくい壊れ方をする */
function persistFromState(
  state: UIState,
  changed: Partial<ViewPreference>,
): void {
  persistViewPreference({
    gridMode: state.gridMode,
    isPathVisible: state.isPathVisible,
    isStageMarksVisible: state.isStageMarksVisible,
    isBlindSpotCheckVisible: state.isBlindSpotCheckVisible,
    isSwipeSceneChangeEnabled: state.isSwipeSceneChangeEnabled,
    ...changed,
  });
}

export const useUIStore = create<UIState>((set) => ({
  selectedSceneId: null,
  previousSceneId: null,
  selectedDancerId: null,
  // 3つの既定値は viewPreference が持つ。サーバーで描くHTMLと最初の
  // ブラウザ描画を一致させるため、ここでは必ず既定から始め、
  // 読み込みは loadViewPreference に任せる
  gridMode: DEFAULT_VIEW_PREFERENCE.gridMode,
  toast: null,
  focusedDancerId: null,
  isPathVisible: DEFAULT_VIEW_PREFERENCE.isPathVisible,
  isStageMarksVisible: DEFAULT_VIEW_PREFERENCE.isStageMarksVisible,
  isBlindSpotCheckVisible: DEFAULT_VIEW_PREFERENCE.isBlindSpotCheckVisible,
  isSwipeSceneChangeEnabled: DEFAULT_VIEW_PREFERENCE.isSwipeSceneChangeEnabled,
  isTransitioning: false,
  dragSnapLine: { x: null, y: null },
  isPlaying: false,
  isSceneSheetOpen: false,
  isAddDancerSheetOpen: false,
  isTemplateSheetOpen: false,
  confirm: null,
  authDialogMode: null,

  // 同じシーンを選び直したときにpreviousSceneIdを上書きしない。上書きすると
  // 「前のシーン＝今のシーン」になって移動方向が判定できなくなるため
  selectScene: (sceneId) =>
    set((state) =>
      state.selectedSceneId === sceneId
        ? {}
        : { selectedSceneId: sceneId, previousSceneId: state.selectedSceneId },
    ),
  selectDancer: (dancerId) => set({ selectedDancerId: dancerId }),
  setGridMode: (mode) =>
    set((state) => {
      persistFromState(state, { gridMode: mode });
      return { gridMode: mode };
    }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  setFocusedDancer: (dancerId) => set({ focusedDancerId: dancerId }),
  toggleBlindSpotCheck: () =>
    set((state) => {
      const isBlindSpotCheckVisible = !state.isBlindSpotCheckVisible;
      persistFromState(state, { isBlindSpotCheckVisible });
      return { isBlindSpotCheckVisible };
    }),
  toggleStageMarks: () =>
    set((state) => {
      const isStageMarksVisible = !state.isStageMarksVisible;
      persistFromState(state, { isStageMarksVisible });
      return { isStageMarksVisible };
    }),
  setIsTransitioning: (isTransitioning) =>
    set((state) =>
      state.isTransitioning === isTransitioning ? {} : { isTransitioning },
    ),
  toggleSwipeSceneChange: () =>
    set((state) => {
      const isSwipeSceneChangeEnabled = !state.isSwipeSceneChangeEnabled;
      persistFromState(state, { isSwipeSceneChangeEnabled });
      return { isSwipeSceneChangeEnabled };
    }),
  togglePathVisible: () =>
    set((state) => {
      const isPathVisible = !state.isPathVisible;
      persistFromState(state, { isPathVisible });
      return { isPathVisible };
    }),
  loadViewPreference: () => {
    let preference = DEFAULT_VIEW_PREFERENCE;
    try {
      preference = parseViewPreference(localStorage.getItem(VIEW_STORAGE_KEY));
    } catch {
      // localStorage自体が触れない環境。既定のまま動かす
    }
    set(preference);
  },
  // 中身が前回と同じなら何も書き換えない(空オブジェクトを返す=状態は不変)。
  // これはドラッグ中に毎pointermoveごとに呼ばれるため、素直に
  // set({ dragSnapLine: line })にすると、スナップしていない間も毎回
  // 新しい{x: null, y: null}オブジェクトが入り、参照が変わるせいで
  // これを購読しているStageが指を動かすたびに再レンダーされてしまう
  setDragSnapLine: (line) =>
    set((state) =>
      state.dragSnapLine.x === line.x && state.dragSnapLine.y === line.y
        ? {}
        : { dragSnapLine: line },
    ),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSceneSheetOpen: (isOpen) => set({ isSceneSheetOpen: isOpen }),
  setAddDancerSheetOpen: (isOpen) => set({ isAddDancerSheetOpen: isOpen }),
  setTemplateSheetOpen: (isOpen) => set({ isTemplateSheetOpen: isOpen }),
  requestConfirm: (request) => set({ confirm: request }),
  closeConfirm: () => set({ confirm: null }),
  openAuthDialog: (mode) => set({ authDialogMode: mode }),
  closeAuthDialog: () => set({ authDialogMode: null }),
}));
