"use client";

import { create } from "zustand";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import type { Project } from "@/features/project/types";
import type { PositionsBySceneId } from "@/features/viewer/lib/interpolate";
import {
  loadFocusedDancerId,
  saveFocusedDancerId,
} from "@/features/viewer/lib/focusPreference";

type ViewerState = {
  project: Project | null;
  dancers: Dancer[];
  scenes: Scene[];
  positionsBySceneId: PositionsBySceneId;

  /** 「自分」に選んだポジション。未選択なら入口の画面を出す */
  focusedDancerId: string | null;
  /** 「選ばずに全員を見る」を選んだか。未選択(null)と区別する */
  hasChosen: boolean;
  /** いま何秒目を見ているか。スクラブで動く */
  currentSeconds: number;
  /** 自分の導線を出すか。隊形だけ見たいことがある */
  isPathVisible: boolean;

  hydrate: (input: {
    project: Project;
    dancers: Dancer[];
    scenes: Scene[];
    positions: Position[];
    /** ?p= で指定されたポジション。端末の記憶より優先する */
    requestedDancerId?: string | null;
  }) => void;
  focusDancer: (dancerId: string | null) => void;
  setCurrentSeconds: (seconds: number) => void;
  togglePath: () => void;
};

/**
 * 閲覧専用ビューアの状態。
 *
 * ■ エディタのストアを使い回さない
 * 編集用のアクション(移動・追加・削除)を持たない【別のストア】にする。
 * ボタンを隠すだけの作りにすると、支援技術からは押せてしまうし、
 * キーボードのショートカットも生きたままになる。持っていないものは
 * 押せない、という形がいちばん確実。
 *
 * ■ 時刻だけを持ち、シーンの選択を持たない
 * この画面の主操作はスクラブで、いちばんの値打ちは移動の途中で
 * 止められること。「いま何番のシーン」ではなく「いま何秒目」を正にすると、
 * 区間の途中という状態が自然に表せる。
 */
export const useViewerStore = create<ViewerState>((set, get) => ({
  project: null,
  dancers: [],
  scenes: [],
  positionsBySceneId: {},
  focusedDancerId: null,
  hasChosen: false,
  currentSeconds: 0,
  isPathVisible: true,

  hydrate: ({ project, dancers, scenes, positions, requestedDancerId }) => {
    const positionsBySceneId: PositionsBySceneId = {};
    for (const position of positions) {
      positionsBySceneId[position.sceneId] ??= {};
      positionsBySceneId[position.sceneId][position.dancerId] = position;
    }

    const remembered = loadFocusedDancerId(project.id);
    const wanted = requestedDancerId ?? remembered;
    // 選んだ人が消えている・入れ替わっている場合は選択を解除して入口へ戻す。
    // 黙って別人になるより安全
    const exists = dancers.some((dancer) => dancer.id === wanted);
    const focusedDancerId = exists ? (wanted as string) : null;

    if (requestedDancerId && exists) {
      saveFocusedDancerId(project.id, requestedDancerId);
    }

    set({
      project,
      dancers,
      scenes,
      positionsBySceneId,
      focusedDancerId,
      hasChosen: focusedDancerId !== null,
      currentSeconds: scenes[0]?.timeSeconds ?? 0,
    });
  },

  focusDancer: (dancerId) => {
    const projectId = get().project?.id;
    if (projectId) saveFocusedDancerId(projectId, dancerId);
    set({ focusedDancerId: dancerId, hasChosen: true });
  },

  setCurrentSeconds: (seconds) =>
    set({ currentSeconds: Math.max(0, seconds) }),

  togglePath: () => set((state) => ({ isPathVisible: !state.isPathVisible })),
}));
