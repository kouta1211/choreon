"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  renameScene as renameSceneApi,
  updateSceneMoveBeats,
  updateSceneBeats,
} from "@/features/scene/api/scenes";
import {
  beatsForTimes,
  DEFAULT_PLACEMENTS,
  sameBeat,
} from "@/features/music/lib/placement";
import type { Scene } from "@/features/scene/types";
import {
  moveSceneTo,
  moveSceneToBeat,
  retimeForOrder,
  retimeScene,
} from "@/features/scene/lib/sceneTiming";
import { useDeleteScenes } from "@/features/scene/hooks/useDeleteScenes";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * シーンの改名・並び替え・遷移時間・削除。
 *
 * これらを操作できる場所が3つある(下部ドック / シーン一覧シート /
 * 画面が広いときのサイドバー)ため、処理をフックに置いて共有する。
 * 以前はドックが持っていて、シートへはpropsで配っていた。
 *
 * どれも楽観的更新(先にローカルへ反映し、保存に失敗したら戻す)。
 */
export function useSceneActions() {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const renameScene = useProjectStore((state) => state.renameScene);
  const applySceneBeats = useProjectStore((state) => state.applySceneBeats);
  const placements = useProjectStore(
    (state) => state.project?.musicPlacements ?? DEFAULT_PLACEMENTS,
  );
  const setSceneMoveBeats = useProjectStore(
    (state) => state.setSceneMoveBeats,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);
  const pushHistory = useHistoryStore((state) => state.push);
  const deleteScenes = useDeleteScenes();

  const renameSceneTo = async (scene: Scene, name: string) => {
    const previousName = scene.name;
    renameScene(scene.id, name);

    try {
      await persist((supabase) => renameSceneApi(supabase, scene.id, name));
    } catch (error) {
      renameScene(scene.id, previousName);
      showToast({
        message: toUserMessage(error, t.sceneActions.renameFailed),
        type: "error",
      });
    }
  };

  /**
   * 一覧で行を並び替えたとき。
   *
   * 並び順の正は位置なので、順番そのものを保存する場所は無い。
   * 位置を書き換えることで、結果としてその位置に並ぶ。
   *
   * **動かした1つだけ**を新しい隣同士の中間へ置く。触っていないシーンは
   * 動かさない — カウントで組むようになって（2026-08-26）「3-5 に置いた」
   * こと自体が振付の意図になったので、勝手に積み直さない。
   *
   * 以前は「合わせる相手が無い作品」だけ全部を積み直していたが、
   * その概念ごと畳んだ（lib/timelineMode を削除）。
   */
  const reorderTo = async (orderedSceneIds: string[]) => {
    await commitTimes(retimeForOrder(scenes, orderedSceneIds));
  };

  /** シーンを別の時刻へ動かす。**動くのはそのシーン1つだけ**で、
   * 隣を追い越せば順番もそのまま入れ替わる（並び順の正は時刻）。
   *
   * 「以降も一緒にずらす」の口はここには無い（2026-08-24 に外した）。
   * 要るのは「移動が間に合わないから後ろへ送る」ときだけで、それは
   * `changeSegmentSeconds` の ripple が持っている（useExtendMoveTime）。 */
  const changeSceneTime = async (scene: Scene, seconds: number) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;
    await commitTimes(moveSceneTo(scenes, index, seconds));
  };

  /**
   * 位置を**拍で**変える。カウントの欄から呼ぶ（2026-08-26）。
   *
   * ⚠️ **秒へ直さない**（2026-09-25）。以前はここで `secondsAtBeat` を
   * 通して秒の道（`moveSceneTo`）へ流していたが、あちらは1ミリ秒の格子へ
   * 丸めるので、拍へ割り戻したときに 88 が 87.99916… になる。
   * カウントは切り捨てで出すため、打った `12-1` が **11-8 と表示された**
   * （user の報告 2026-09-25）。拍で受けたものは拍のまま確定する。
   */
  const changeSceneBeats = async (scene: Scene, positionBeats: number) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;
    await commitBeats(moveSceneToBeat(scenes, index, positionBeats));
  };

  /** 「このシーンへ入ってくる時間」を変える。
   * ripple を立てると、以降のシーンも同じだけ後ろへずれる */
  const changeSegmentSeconds = async (
    scene: Scene,
    seconds: number,
    ripple: boolean,
    /** 提案をボタンで当てたときだけ立てる。元に戻す1回で消えるようにする */
    recordHistory = false,
  ) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;
    await commitTimes(
      retimeScene(scenes, index, seconds, ripple).timesById,
      recordHistory,
    );
  };

  /** 秒で決まった操作（引いて動かす・間隔を変える）の入口。
   *
   * **拍へ直してから確定する。** 秒は拍から導いた派生値なので、丸めの
   * 都合で `4.000000000000001` のような値になりうる。秒で比べると
   * 「動かしていない行まで変わった」と判定して書き込んでしまう */
  const commitTimes = async (
    timesById: Map<string, number>,
    recordHistory = false,
  ) => {
    await commitBeats(beatsForTimes(timesById, placements), recordHistory);
  };

  /** 楽観的更新 → 保存 → 失敗したら元の拍へ戻す。
   * 動いたシーンだけを送る(全件送ると、触っていない行まで書き換わる) */
  const commitBeats = async (
    beatsById: Map<string, number>,
    /** 履歴へ積むか。**提案をボタンで当てたときだけ true。**
     * 手で欄を打つ操作は、打った本人が打ち直せるので積まない
     * (積むと、数字を1つ直すたびに履歴が1段増える) */
    recordHistory = false,
  ) => {
    const changed = scenes
      .filter((scene) => {
        const next = beatsById.get(scene.id);
        return next !== undefined && !sameBeat(next, scene.positionBeats);
      })
      .map((scene) => ({
        id: scene.id,
        positionBeats: beatsById.get(scene.id)!,
      }));
    if (changed.length === 0) return;

    const previous = new Map(scenes.map((s) => [s.id, s.positionBeats]));
    applySceneBeats(beatsById);

    if (recordHistory) {
      pushHistory({
        kind: "retime",
        changes: [],
        /* **履歴も拍で積む。** 秒で積むと、曲へ載せ直したあとに戻したとき
           古い秒が復活して隊形が音からずれる */
        sceneTimes: changed.map((scene) => ({
          sceneId: scene.id,
          beforeBeats: previous.get(scene.id) ?? scene.positionBeats,
          afterBeats: scene.positionBeats,
        })),
      });
    }

    try {
      await persist((supabase) =>
        updateSceneBeats(supabase, changed, placements),
      );
    } catch (error) {
      applySceneBeats(previous);
      showToast({
        message: toUserMessage(error, t.sceneActions.retimeFailed),
        type: "error",
      });
    }
  };

  /**
   * 区間のうち、**動くのに使う**カウント数を変える。null で区間まるごとへ。
   *
   * **時刻には触らない。** 変わるのは区間の【中】の割り方だけで、
   * 次のシーンが来る瞬間は動かない。だから以降のシーンもずれない
   * （旧 transition_duration_seconds を落とした理由がここに当たらない）。
   *
   * 割り方そのものは `lib/segmentSplit` が持つ。余りは**移動の前**に
   * 置かれるので、短くすると【止まってから、最後に動く】になる。
   */
  const changeMoveBeats = async (scene: Scene, moveBeats: number | null) => {
    const previous = scene.moveBeats ?? null;
    /* **秒を受ける口は無い**（2026-08-26）。欄がカウントで打つように
       なったので、換算を挟むと丸めの往復が入るだけで得るものが無い。
       第1段と同じで、古い形を受け付けない型にして取り残しを消す */
    setSceneMoveBeats(scene.id, moveBeats);

    try {
      await persist((supabase) =>
        updateSceneMoveBeats(
          supabase,
          scene.id,
          moveBeats,
          scene.positionBeats,
          placements,
        ),
      );
    } catch (error) {
      setSceneMoveBeats(scene.id, previous);
      showToast({
        message: toUserMessage(error, t.sceneActions.moveSecondsFailed),
        type: "error",
      });
    }
  };

  /**
   * 1件だけ消す。**まとめて消すのと同じ道**を通す（`useDeleteScenes`）。
   *
   * 以前はここが自前で持っていて、消したあと**必ず先頭のシーンへ飛んで**
   * いた。1件と複数で「消したあとどこを見るか」の規則が分かれると、
   * 必ず片方が取り残される（.claude/rules/state.md 6節）。
   */
  const confirmDelete = (scene: Scene) => {
    deleteScenes([scene.id]);
  };

  // 再生中に手動でシーンを選んだら再生を止める(取りこぼしのない一貫した
  // 挙動にするため。クリック・レール・並び替えのどれ経由でも同じ)
  const selectSceneManually = (sceneId: string) => {
    setIsPlaying(false);
    selectScene(sceneId);
  };

  return {
    renameSceneTo,
    reorderTo,
    changeSceneTime,
    changeSceneBeats,
    changeSegmentSeconds,
    changeMoveBeats,
    confirmDelete,
    selectSceneManually,
  };
}
