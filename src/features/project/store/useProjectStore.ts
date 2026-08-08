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

  /** ゲスト(未ログイン)の下書きかどうか。trueの間、編集はこのstoreの中だけに
   * 留まり、Supabaseへは一切書き込まない(persist()が窓口)。
   *
   * 「ログインしているか」ではなく「このプロジェクトがDBに在るか」を持って
   * いるのは、判定したい場所が常に後者だから。ログイン済みでも、まだ保存して
   * いない下書きを開いている状態はありうる */
  isGuest: boolean;
  /** ゲストの下書きに、保存されていない変更があるか。
   * 離脱時の警告(UnsavedChangesGuard)を出すかどうかの判定に使う */
  hasUnsavedChanges: boolean;

  // Supabaseから取得した初期データを流し込む
  hydrate: (data: {
    project: Project;
    dancers: Dancer[];
    scenes: Scene[];
    positions: Position[];
    /** 省略時はfalse(=DBに在るプロジェクト)。ゲストの下書きのときだけtrue */
    isGuest?: boolean;
  }) => void;

  /** プロジェクト名の変更。ゲストの下書きをそのままクラウドへ保存するとき、
   * 名前も含めて送れるようにここへ持たせている */
  renameProject: (title: string) => void;

  /** ゲストの編集が1つでも起きたことを記録する(persist()から呼ばれる) */
  markUnsaved: () => void;
  /** クラウドへの保存が完了した。以後は通常どおりSupabaseへ書き込む */
  markSaved: () => void;

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
  updateSceneDuration: (sceneId: string, transitionDurationSeconds: number) => void;

  // --- Position ---
  // ドラッグ操作の確定時(dnd-kitのonDragEnd)に1回だけ呼ばれる想定。
  // 渡さなかったフィールド(ダンサー個別の遷移時間・曲線制御点など)は
  // 既存の値を保持する(下のupdateDancerPosition実装のマージ挙動を参照)
  updateDancerPosition: (
    sceneId: string,
    dancerId: string,
    next: Partial<
      Pick<
        Position,
        | "xCoordinate"
        | "yCoordinate"
        | "rotationAngle"
        | "dancerTransitionDurationSeconds"
        | "curveControlX"
        | "curveControlY"
      >
    >,
  ) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  dancers: {},
  scenes: [],
  positionsBySceneId: {},
  isGuest: false,
  hasUnsavedChanges: false,

  hydrate: ({ project, dancers, scenes, positions, isGuest = false }) =>
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
        isGuest,
        // 読み込んだ直後は、まだ何も編集していない
        hasUnsavedChanges: false,
      };
    }),

  renameProject: (title) =>
    set((state) =>
      state.project ? { project: { ...state.project, title } } : {},
    ),

  // 既にtrueなら書き換えない。この関数は編集のたびに呼ばれるので、毎回
  // set()すると購読しているコンポーネント(離脱ガード)が無駄に再レンダーされる
  markUnsaved: () =>
    set((state) => (state.hasUnsavedChanges ? {} : { hasUnsavedChanges: true })),

  markSaved: () => set({ isGuest: false, hasUnsavedChanges: false }),

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

  updateSceneDuration: (sceneId, transitionDurationSeconds) =>
    set((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, transitionDurationSeconds }
          : scene,
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

  // 既存レコードとマージする(丸ごと置き換えない)。渡さなかったフィールドは
  // 既存の値を保持する。例えばドラッグでxCoordinate/yCoordinateだけを渡した
  // 場合、そのダンサーに設定済みの個別遷移時間・曲線制御点が消えてしまう
  // ことを防ぐため
  updateDancerPosition: (sceneId, dancerId, next) =>
    set((state) => {
      const existing = state.positionsBySceneId[sceneId]?.[dancerId];
      const merged: Position = {
        sceneId,
        dancerId,
        xCoordinate: next.xCoordinate ?? existing?.xCoordinate ?? 0,
        yCoordinate: next.yCoordinate ?? existing?.yCoordinate ?? 0,
        rotationAngle: next.rotationAngle ?? existing?.rotationAngle ?? 0,
        dancerTransitionDurationSeconds:
          "dancerTransitionDurationSeconds" in next
            ? next.dancerTransitionDurationSeconds
            : existing?.dancerTransitionDurationSeconds,
        curveControlX:
          "curveControlX" in next
            ? next.curveControlX
            : existing?.curveControlX,
        curveControlY:
          "curveControlY" in next
            ? next.curveControlY
            : existing?.curveControlY,
      };
      return {
        positionsBySceneId: {
          ...state.positionsBySceneId,
          [sceneId]: {
            ...state.positionsBySceneId[sceneId],
            [dancerId]: merged,
          },
        },
      };
    }),
}));
