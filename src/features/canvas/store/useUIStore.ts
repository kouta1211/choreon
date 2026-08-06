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

  selectScene: (sceneId: string | null) => void;
  selectDancer: (dancerId: string | null) => void;
  toggleGrid: () => void;
  setDraggingDancerId: (dancerId: string | null) => void;
  showToast: (toast: Toast) => void;
  clearToast: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedSceneId: null,
  selectedDancerId: null,
  isGridVisible: true,
  draggingDancerId: null,
  toast: null,

  selectScene: (sceneId) => set({ selectedSceneId: sceneId }),
  selectDancer: (dancerId) => set({ selectedDancerId: dancerId }),
  toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
  setDraggingDancerId: (dancerId) => set({ draggingDancerId: dancerId }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
