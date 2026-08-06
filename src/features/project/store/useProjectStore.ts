import { create } from "zustand";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

/** シーンごと・ダンサーごとのPosition。DBの複合PK(scene_id, dancer_id)に対応させ、
 * `positionsBySceneId[sceneId][dancerId]` で1件を引けるようにする */
type PositionsBySceneId = Record<string, Record<string, Position>>;

type ProjectState = {
  project: Project | null;
  dancers: Record<string, Dancer>;
  scenes: Scene[];
  positionsBySceneId: PositionsBySceneId;

  // Supabaseから取得した初期データを流し込む
  hydrate: (data: {
    project: Project;
    dancers: Dancer[];
    scenes: Scene[];
    positions: Position[];
  }) => void;

  // --- Dancer ---
  // 楽観的UI: まずここでstateを更新し、呼び出し側(features/project/api)が
  // Supabaseへの保存を行う。保存失敗時は呼び出し側がここで前の状態に戻す
  addDancer: (dancer: Dancer) => void;
  removeDancer: (dancerId: string) => void;

  // --- Scene ---
  addScene: (scene: Scene) => void;
  // Supabaseへの保存に失敗したとき、addSceneを取り消すためのロールバック用。
  // 実際の削除(確定後更新)にも流用する
  removeScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  reorderScenes: (orderedSceneIds: string[]) => void;

  // --- Position ---
  // ドラッグ操作の確定時(dnd-kitのonDragEnd)に1回だけ呼ばれる想定
  updateDancerPosition: (
    sceneId: string,
    dancerId: string,
    next: Pick<Position, "xCoordinate" | "yCoordinate" | "rotationAngle">,
  ) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  dancers: {},
  scenes: [],
  positionsBySceneId: {},

  hydrate: ({ project, dancers, scenes, positions }) =>
    set(() => {
      const dancersById: Record<string, Dancer> = {};
      for (const dancer of dancers) {
        dancersById[dancer.id] = dancer;
      }

      const positionsBySceneId: PositionsBySceneId = {};
      for (const position of positions) {
        positionsBySceneId[position.sceneId] ??= {};
        positionsBySceneId[position.sceneId][position.dancerId] = position;
      }

      return {
        project,
        dancers: dancersById,
        scenes: [...scenes].sort((a, b) => a.orderIndex - b.orderIndex),
        positionsBySceneId,
      };
    }),

  addDancer: (dancer) =>
    set((state) => ({
      dancers: { ...state.dancers, [dancer.id]: dancer },
    })),

  removeDancer: (dancerId) =>
    set((state) => ({
      dancers: Object.fromEntries(
        Object.entries(state.dancers).filter(([id]) => id !== dancerId),
      ),
      // 各シーンの positions からも該当ダンサーの分を消しておかないと、
      // ロールバック後にゴーストの位置データが残ってしまう
      positionsBySceneId: Object.fromEntries(
        Object.entries(state.positionsBySceneId).map(([sceneId, positions]) => [
          sceneId,
          Object.fromEntries(
            Object.entries(positions).filter(([id]) => id !== dancerId),
          ),
        ]),
      ),
    })),

  addScene: (scene) =>
    set((state) => ({
      scenes: [...state.scenes, scene].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      ),
    })),

  removeScene: (sceneId) =>
    set((state) => {
      const positionsBySceneId = { ...state.positionsBySceneId };
      delete positionsBySceneId[sceneId];
      return {
        scenes: state.scenes.filter((scene) => scene.id !== sceneId),
        positionsBySceneId,
      };
    }),

  renameScene: (sceneId, name) =>
    set((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, name } : scene,
      ),
    })),

  reorderScenes: (orderedSceneIds) =>
    set((state) => {
      const sceneById = new Map(state.scenes.map((s) => [s.id, s]));
      const reordered = orderedSceneIds
        .map((id, index) => {
          const scene = sceneById.get(id);
          return scene ? { ...scene, orderIndex: index } : null;
        })
        .filter((scene): scene is Scene => scene !== null);
      return { scenes: reordered };
    }),

  updateDancerPosition: (sceneId, dancerId, next) =>
    set((state) => ({
      positionsBySceneId: {
        ...state.positionsBySceneId,
        [sceneId]: {
          ...state.positionsBySceneId[sceneId],
          [dancerId]: { sceneId, dancerId, ...next },
        },
      },
    })),
}));
