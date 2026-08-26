import { create } from "zustand";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import { sortScenes } from "@/features/scene/lib/sceneTiming";
import {
  beatsForTimes,
  DEFAULT_PLACEMENTS,
  restretch,
  withDerivedTimes,
  type Placement,
} from "@/features/music/lib/placement";
import type { Position, Scene } from "@/features/scene/types";

/** シーンごと・ダンサーごとのPosition。DBの複合PK(scene_id, dancer_id)に対応させ、
 * `positionsBySceneId[sceneId][dancerId]` で1件を引けるようにする */
type PositionsBySceneId = Record<string, Record<string, Position>>;

type ProjectState = {
  project: Project | null;
  dancers: Record<string, Dancer>;
  scenes: Scene[];
  positionsBySceneId: PositionsBySceneId;

  /** シーンごとのミニチュア(点だけを描いたSVGのdataURL)。
   *
   * positionsから毎回描くこともできるが、シーン一覧は全シーンぶんの点を
   * 一度に出す場所なので、人数×シーン数だけのDOM要素が並ぶ。1枚の画像に
   * 焼いておけば、並べる要素はシーン数と同じになる。
   *
   * 中身を作るのは useSceneThumbnails。**このストアの中では作らない**。
   * 焼くにはテーマごとの色の実測値が要り、それはDOMからしか読めないため
   * (詳しくは useSceneThumbnails のコメント)。 */
  thumbnailBySceneId: Record<string, string>;

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

  /** ミニチュアを丸ごと差し替える。呼ぶのは useSceneThumbnails だけ */
  setThumbnails: (thumbnailBySceneId: Record<string, string>) => void;

  /** 曲の開始位置(秒)の変更。プロジェクト名と同じく、表示中の値の置き場を
   * storeに一本化するために持たせている */
  /** 選んでいる曲の名前。**音源は端末に置いたまま**で、名前だけが作品に付く */
  setMusicTitle: (musicTitle: string | null) => void;

  /** プロジェクト名の変更。ゲストの下書きをそのままクラウドへ保存するとき、
   * 名前も含めて送れるようにここへ持たせている */
  renameProject: (title: string) => void;
  /** 曲の速さ。カウントで組むときの物差しなので、作品が持つ */
  setBpm: (bpm: number) => void;
  /** 拍子。稽古場で数える単位は8カウントだが、それは拍子とは別の話で、
   * メトロノームの強拍と拍線の太さだけがこの値で決まる */
  setBeatsPerBar: (beatsPerBar: number) => void;
  /** メトロノームを鳴らすか。**作品の設定**で、共有した相手にも引き継ぐ */
  setMetronome: (isMetronomeEnabled: boolean) => void;
  /** ステージの広さ。作ったあとでも変えられる(実機報告 03-10) */
  setStageSize: (stageWidth: number, stageHeight: number) => void;
  /** 共有のオン/オフと、リンクの合鍵。どちらも作品が持つ */
  setSharing: (isShared: boolean) => void;
  setShareToken: (shareToken: string) => void;

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
  /** 秒で来た変更を適用する。**中で拍へ直し、秒は拍から作り直す**
   *  （渡された秒はそのまま持たない。正は拍） */
  applySceneTimes: (timesById: Map<string, number>) => void;
  /** 拍で来た変更を適用する。履歴のように**拍で考える側**が使う */
  applySceneBeats: (beatsById: Map<string, number>) => void;
  /** 曲への載せ方を差し替える。**全シーンの秒を作り直す** */
  applyPlacements: (placements: Placement[]) => void;
  /** そのシーンへ入ってくる区間の「動くのに使う秒数」。null で区間まるごとへ戻す */
  setSceneMoveBeats: (sceneId: string, moveBeats: number | null) => void;

  // --- Position ---
  // ドラッグ操作の確定時(dnd-kitのonDragEnd)に1回だけ呼ばれる想定。
  // 渡さなかったフィールド(曲線制御点など)は既存の値を保持する
  // (下のupdateDancerPosition実装のマージ挙動を参照)
  updateDancerPosition: (
    sceneId: string,
    dancerId: string,
    next: Partial<
      Pick<
        Position,
        | "xCoordinate"
        | "yCoordinate"
        | "rotationAngle"
        | "curveControlX"
        | "curveControlY"
      >
    >,
  ) => void;
};

/** その作品の載せ方。作品がまだ無いときは既定の物差し */
function placementsOf(state: {
  project: Project | null;
}): readonly Placement[] {
  return state.project?.musicPlacements ?? DEFAULT_PLACEMENTS;
}

/**
 * 拍の変更を適用する。**並べ直すのを忘れない** —
 * 位置が並び順の正なので、隣を追い越す拍を入れたらその場で順番も入れ替わる。
 */
function applyBeats(
  state: { project: Project | null; scenes: Scene[] },
  beatsById: ReadonlyMap<string, number>,
): { scenes: Scene[] } {
  const placements = placementsOf(state);
  return {
    scenes: sortScenes(
      withDerivedTimes(
        state.scenes.map((scene) => {
          const next = beatsById.get(scene.id);
          return next === undefined ? scene : { ...scene, positionBeats: next };
        }),
        placements,
      ),
    ),
  };
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  dancers: {},
  scenes: [],
  positionsBySceneId: {},
  thumbnailBySceneId: {},
  isGuest: false,
  hasUnsavedChanges: false,

  setThumbnails: (thumbnailBySceneId) => set({ thumbnailBySceneId }),

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
        // 念のためもう一度派生を作る（API 層で通してあるが、口を1つに保つ）
        scenes: sortScenes(withDerivedTimes(scenes, project.musicPlacements)),
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

  /**
   * 速さを変える。**シーンのカウントは1つも動かない**（2026-08-26 に変更）。
   *
   * 変わるのは**1カウントが何秒か**だけで、`3-5` は `3-5` のまま。
   * 動くのは秒の側なので、時間軸の上ではコマの間隔が広がる／縮まる。
   *
   * ⚠️ **以前は逆だった**（`regrid`：秒を保って拍を数え直す）。
   * 画面が秒を出していたころは「コマが動かない」方が自然に見えたが、
   * 第2段でカウントを出すようにした瞬間に**壊れた** —
   * BPM を 120 → 90 にすると `3-5` が `2-8` になり、
   * **振付の中身そのものが書き換わって**いた。
   *
   * 数え直す操作（`regrid`）は、これで誰も呼ばなくなったので消した。
   * 要るとしたら「実は倍テンポで数えていた」という直しだが、
   * まだ困っていないので作らない。
   */
  setBpm: (bpm: number) =>
    set((state) => {
      if (!state.project) return {};
      const placements = restretch(
        state.project.musicPlacements,
        60 / Math.max(1, bpm),
      );
      return {
        project: { ...state.project, bpm, musicPlacements: placements },
        // 拍はそのまま。**秒だけが全部動く**
        scenes: sortScenes(withDerivedTimes(state.scenes, placements)),
      };
    }),

  setBeatsPerBar: (beatsPerBar: number) =>
    set((state) =>
      state.project ? { project: { ...state.project, beatsPerBar } } : {},
    ),

  setMetronome: (isMetronomeEnabled: boolean) =>
    set((state) =>
      state.project
        ? { project: { ...state.project, isMetronomeEnabled } }
        : {},
    ),

  setStageSize: (stageWidth: number, stageHeight: number) =>
    set((state) =>
      state.project
        ? { project: { ...state.project, stageWidth, stageHeight } }
        : {},
    ),

  setSharing: (isShared: boolean) =>
    set((state) =>
      state.project ? { project: { ...state.project, isShared } } : {},
    ),

  setShareToken: (shareToken: string) =>
    set((state) =>
      state.project ? { project: { ...state.project, shareToken } } : {},
    ),

  setMusicTitle: (musicTitle) =>
    set((state) =>
      state.project ? { project: { ...state.project, musicTitle } } : {},
    ),


  // 既にtrueなら書き換えない。この関数は編集のたびに呼ばれるので、毎回
  // set()すると購読しているコンポーネント(離脱ガード)が無駄に再レンダーされる
  markUnsaved: () =>
    set((state) =>
      state.hasUnsavedChanges ? {} : { hasUnsavedChanges: true },
    ),

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

  /* **派生した秒をここでも作り直す。** 呼び出し側が組み立てた Scene を
     そのまま入れると、追加した1つだけが拍と秒の食い違ったシーンになる
     （`.claude/rules/state.md` 6節） */
  addScene: (scene) =>
    set((state) => ({
      scenes: sortScenes(
        withDerivedTimes([...state.scenes, scene], placementsOf(state)),
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

  /** 複数シーンの時刻をまとめて差し替える。1つ動かすと隣も動くこと
   * (リップル)があるので、常に一括で受ける */
  setSceneMoveBeats: (sceneId, moveBeats) =>
    set((state) => ({
      // 並べ直さない。移動時間は**区間の中**の話で、並び順の正である
      // 位置には触らないため（applySceneTimes とはそこが違う）
      scenes: withDerivedTimes(
        state.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, moveBeats } : scene,
        ),
        placementsOf(state),
      ),
    })),

  applySceneTimes: (timesById) =>
    set((state) => {
      const placements = placementsOf(state);
      /* **渡された秒は持たない。** 拍へ直し、秒は拍から作り直す。
         そのまま持つと、載せ方で表せない秒が残り、次の変換で辻褄が
         合わなくなる（正は拍の側） */
      return applyBeats(state, beatsForTimes(timesById, placements));
    }),

  applySceneBeats: (beatsById) =>
    set((state) => applyBeats(state, beatsById)),

  applyPlacements: (placements) =>
    set((state) => {
      if (!state.project) return {};
      return {
        project: { ...state.project, musicPlacements: placements },
        // 拍はそのまま。**秒だけが全部動く**
        scenes: sortScenes(withDerivedTimes(state.scenes, placements)),
      };
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

/**
 * いまの立ち位置を1件だけ、その瞬間の値として読む。
 *
 * 購読(useProjectStore(selector))ではないので**再描画を起こさない**。
 * ドラッグや回転を確定する場面で、ハンドラの中から「動かす前は何だったか」を
 * 取りにいくための読み方。ここを購読にすると、誰か1人が動くたびに
 * キャンバス全体が描き直され、memo が効かなくなる(CanvasBoard のコメント参照)。
 */
export function positionAt(
  sceneId: string,
  dancerId: string,
): Position | undefined {
  return useProjectStore.getState().positionsBySceneId[sceneId]?.[dancerId];
}
