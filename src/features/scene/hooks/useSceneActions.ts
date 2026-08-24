"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  renameScene as renameSceneApi,
  updateSceneMoveSeconds,
  updateSceneTimes,
} from "@/features/scene/api/scenes";
import type { Scene } from "@/features/scene/types";
import {
  moveSceneTo,
  retimeForOrder,
  uniformTimes,
  retimeScene,
} from "@/features/scene/lib/sceneTiming";
import { useDeleteScenes } from "@/features/scene/hooks/useDeleteScenes";
import { useT } from "@/features/i18n/LocaleProvider";
import { useOrderOnlyTimeline } from "@/features/scene/hooks/useOrderOnlyTimeline";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

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
  /* 時刻という概念を出しているかどうか。並び替えの直し方がここで変わる */
  const isOrderOnly = useOrderOnlyTimeline();
  const defaultSegmentSeconds = useSettingsStore(
    (state) => state.defaultSegmentSeconds,
  );
  const scenes = useProjectStore((state) => state.scenes);
  const renameScene = useProjectStore((state) => state.renameScene);
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
  const setSceneMoveSeconds = useProjectStore(
    (state) => state.setSceneMoveSeconds,
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
   * 並び順の正は時刻なので、順番そのものを保存する場所は無い。
   * 時刻を書き換えることで、結果としてその位置に並ぶ。**書き換え方が
   * 2通りある**（どちらを使うかは lib/timelineMode の条件と同じ）。
   *
   * - 曲か拍がある … 動かした1つだけを新しい隣同士の中間へ。
   *   触っていないシーンを動かさない（曲に合わせて置いた隊形を守る）
   * - どちらも無い … 全部を同じ秒数で積み直す。この形では時刻が
   *   順番以上のことを持たないので、書き換えても失われるものが無い
   */
  const reorderTo = async (orderedSceneIds: string[]) => {
    await commitTimes(
      isOrderOnly
        ? uniformTimes(orderedSceneIds, defaultSegmentSeconds)
        : retimeForOrder(scenes, orderedSceneIds),
    );
  };

  /** シーンを別の時刻へ動かす。
   * ripple を立てると以降のシーンも同じだけずれる。
   * 立てていなければ前後を追い越さない範囲に収まる */
  const changeSceneTime = async (
    scene: Scene,
    seconds: number,
    ripple = false,
  ) => {
    const index = scenes.findIndex((s) => s.id === scene.id);
    if (index === -1) return;

    if (!ripple) {
      await commitTimes(moveSceneTo(scenes, index, seconds));
      return;
    }
    // 以降をまとめてずらす。retimeScene は「前のシーンからの秒数」で
    // 受けるので、時刻の差に直して渡す
    const previousTime = scenes[index - 1]?.timeSeconds ?? 0;
    await commitTimes(
      retimeScene(scenes, index, seconds - previousTime, true).timesById,
    );
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

  /** 楽観的更新 → 保存 → 失敗したら元の時刻へ戻す。
   * 動いたシーンだけを送る(全件送ると、触っていない行まで書き換わる) */
  const commitTimes = async (
    timesById: Map<string, number>,
    /** 履歴へ積むか。**提案をボタンで当てたときだけ true。**
     * 手で時刻の欄を打つ操作は、打った本人が打ち直せるので積まない
     * (積むと、数字を1つ直すたびに履歴が1段増える) */
    recordHistory = false,
  ) => {
    const changed = scenes
      .filter((scene) => {
        const next = timesById.get(scene.id);
        return next !== undefined && next !== scene.timeSeconds;
      })
      .map((scene) => ({
        id: scene.id,
        timeSeconds: timesById.get(scene.id)!,
      }));
    if (changed.length === 0) return;

    const previous = new Map(scenes.map((s) => [s.id, s.timeSeconds]));
    applySceneTimes(timesById);

    if (recordHistory) {
      pushHistory({
        kind: "retime",
        changes: [],
        sceneTimes: changed.map((scene) => ({
          sceneId: scene.id,
          before: previous.get(scene.id) ?? scene.timeSeconds,
          after: scene.timeSeconds,
        })),
      });
    }

    try {
      await persist((supabase) => updateSceneTimes(supabase, changed));
    } catch (error) {
      applySceneTimes(previous);
      showToast({
        message: toUserMessage(error, t.sceneActions.retimeFailed),
        type: "error",
      });
    }
  };

  /**
   * 区間のうち、**動くのに使う**秒数を変える。null で区間まるごとへ戻す。
   *
   * **時刻には触らない。** 変わるのは区間の【中】の割り方だけで、
   * 次のシーンが来る瞬間は動かない。だから以降のシーンもずれない
   * （旧 transition_duration_seconds を落とした理由がここに当たらない）。
   *
   * 割り方そのものは `lib/segmentSplit` が持つ。余りは**移動の前**に
   * 置かれるので、短くすると【止まってから、最後に動く】になる。
   */
  const changeMoveSeconds = async (
    scene: Scene,
    moveSeconds: number | null,
  ) => {
    const previous = scene.moveSeconds ?? null;
    setSceneMoveSeconds(scene.id, moveSeconds);

    try {
      await persist((supabase) =>
        updateSceneMoveSeconds(supabase, scene.id, moveSeconds),
      );
    } catch (error) {
      setSceneMoveSeconds(scene.id, previous);
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
    changeSegmentSeconds,
    changeMoveSeconds,
    confirmDelete,
    selectSceneManually,
  };
}
