import { create } from "zustand";

type Toast = {
  message: string;
  type: "success" | "error";
};

type UIState = {
  selectedSceneId: string | null;
  selectedDancerId: string | null;
  isGridVisible: boolean;
  /** ドラッグ中のダンサーID。ドラッグ中はdnd-kitのCSS transformのみで
   * 見た目を動かすため、ここでは「どれがドラッグ中か」だけを持つ */
  draggingDancerId: string | null;
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

  selectScene: (sceneId: string | null) => void;
  selectDancer: (dancerId: string | null) => void;
  toggleGrid: () => void;
  setDraggingDancerId: (dancerId: string | null) => void;
  showToast: (toast: Toast) => void;
  clearToast: () => void;
  toggleSymmetryMode: () => void;
  setFocusedDancer: (dancerId: string | null) => void;
  togglePathVisible: () => void;
  toggleBlindSpotCheckVisible: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedSceneId: null,
  selectedDancerId: null,
  isGridVisible: true,
  draggingDancerId: null,
  toast: null,
  isSymmetryMode: false,
  focusedDancerId: null,
  isPathVisible: false,
  isBlindSpotCheckVisible: false,

  selectScene: (sceneId) => set({ selectedSceneId: sceneId }),
  selectDancer: (dancerId) => set({ selectedDancerId: dancerId }),
  toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
  setDraggingDancerId: (dancerId) => set({ draggingDancerId: dancerId }),
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
}));
