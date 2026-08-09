import { create } from "zustand";

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

/** ステージの目盛りの出し方。円形の隊形は格子より同心円の方が読みやすい */
export type GridMode = "square" | "circle" | "none";

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
  /** オンの間、ダンサーをドラッグすると中心線を挟んだペアも連動して動く
   * (CanvasBoard.handleDragEndが読み取って処理する。ここはトグル状態のみ) */
  isSymmetryMode: boolean;
  /** 「マイ・フォーカス」で強調表示中のダンサー。シーンをまたいでも
   * 保持したいUI状態なので、シーン選択と同じくここに置く */
  focusedDancerId: string | null;
  /** オンの間、選択中シーン→次のシーンへの移動導線をステージ上に描画する */
  isPathVisible: boolean;
  /** オンの間、奥のダンサーが手前のダンサーに隠れていないか(顔被り)を判定して警告表示する */
  isBlindSpotCheckVisible: boolean;
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
  /** テンプレートのヒントを×で閉じたシーン。同じシーンでは二度と出さない
   * (「もう分かっている」という意思表示なので、シーンをまたいで覚える
   * 必要はないが、同じシーンで何度も出るのは煩わしい) */
  templateHintDismissedSceneIds: string[];
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
  toggleSymmetryMode: () => void;
  setFocusedDancer: (dancerId: string | null) => void;
  togglePathVisible: () => void;
  toggleBlindSpotCheckVisible: () => void;
  setDragSnapLine: (line: DragSnapLine) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSceneSheetOpen: (isOpen: boolean) => void;
  setAddDancerSheetOpen: (isOpen: boolean) => void;
  setTemplateSheetOpen: (isOpen: boolean) => void;
  dismissTemplateHint: (sceneId: string) => void;
  /** 確認ダイアログを出す。実行された場合の処理はrequest.onConfirmに持たせる */
  requestConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  openAuthDialog: (mode: "login" | "signup") => void;
  closeAuthDialog: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedSceneId: null,
  previousSceneId: null,
  selectedDancerId: null,
  gridMode: "square",
  toast: null,
  isSymmetryMode: false,
  focusedDancerId: null,
  isPathVisible: false,
  isBlindSpotCheckVisible: false,
  dragSnapLine: { x: null, y: null },
  isPlaying: false,
  isSceneSheetOpen: false,
  isAddDancerSheetOpen: false,
  isTemplateSheetOpen: false,
  templateHintDismissedSceneIds: [],
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
  setGridMode: (mode) => set({ gridMode: mode }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  toggleSymmetryMode: () =>
    set((state) => ({ isSymmetryMode: !state.isSymmetryMode })),
  setFocusedDancer: (dancerId) => set({ focusedDancerId: dancerId }),
  togglePathVisible: () =>
    set((state) => ({ isPathVisible: !state.isPathVisible })),
  toggleBlindSpotCheckVisible: () =>
    set((state) => ({
      isBlindSpotCheckVisible: !state.isBlindSpotCheckVisible,
    })),
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
  dismissTemplateHint: (sceneId) =>
    set((state) =>
      state.templateHintDismissedSceneIds.includes(sceneId)
        ? {}
        : {
            templateHintDismissedSceneIds: [
              ...state.templateHintDismissedSceneIds,
              sceneId,
            ],
          },
    ),
  requestConfirm: (request) => set({ confirm: request }),
  closeConfirm: () => set({ confirm: null }),
  openAuthDialog: (mode) => set({ authDialogMode: mode }),
  closeAuthDialog: () => set({ authDialogMode: null }),
}));
