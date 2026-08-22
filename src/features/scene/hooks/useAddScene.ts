"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { canAddScene } from "@/features/scene/lib/canAddScene";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene, updateSceneTimes } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";
import { randomId } from "@/lib/randomId";
import {
  duplicateTimeSeconds,
  insertTimeSeconds,
  uniformTimes,
} from "@/features/scene/lib/sceneTiming";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { nextSceneName } from "@/features/scene/lib/sceneName";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 「いまの配置をコピーして、新しいシーンを作る」処理。
 *
 * ■ なぜ末尾ではなく再生位置なのか(曲があるとき)
 * 曲を流しながら「ここで隊形を変えたい」と思った場所に置けることが、
 * 時間軸を持つ画面の値打ちそのもの。末尾へ足す作りだと、置いてから
 * 時刻を打ち直すことになり、思った場所と手の動きが1往復ずれる。
 * 並び順は時刻の昇順で決まるので、途中に割り込んでもそのまま並ぶ。
 *
 * ■ 曲が無いときは【選んでいるシーンの隣】へ
 * 曲が無いと再生位置は0のまま動かない。そこへ置き続けると、押すたびに
 * 先頭の隙間を半分ずつ食い合い([0]→[0,4]→[0,2,4]→[0,1,2,4]…)、
 * 時間軸ではシーンが潰れて絵(コマ)ではなく旗や束ねになる。追加したのに
 * 何も増えていないように見えていたのはこれ。曲が無いなら「ここ」を指す
 * ものが再生位置ではなく選択中のシーンなので、その隣に足す。
 *
 * ドック(SceneDock)と、シーンが1つも無いときの空ステージの両方から
 * 呼ばれる。ページはServer Componentで関数を渡せないため、propsで配るのでは
 * なく共有のフックにしている。
 *
 * 新しいシーンを空(誰もいない状態)から始めないのは、フォーメーションが
 * 通常は少しずつ変化していくものだから。毎回ゼロから配置し直すのは不自然で、
 * 直前の配置から始めればシーン切り替えのなめらかな移動アニメーションも活きる。
 */
export function useAddScene(project: Project) {
  /* ここは【画面の出し分け】に使うので購読する。保存の道の中で読む
     `getState()` とは役割が違う（あちらは押した瞬間の値が要る） */
  const hasMusicNow = useMusicStore((state) => state.objectUrl) !== null;
  const isPlaying = useUIStore((state) => state.isPlaying);
  const t = useT();
  const [isCreating, setIsCreating] = useState(false);
  const scenes = useProjectStore((state) => state.scenes);
  const addScene = useProjectStore((state) => state.addScene);
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
  const removeScene = useProjectStore((state) => state.removeScene);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);

  const handleAddScene = async () => {
    setIsCreating(true);
    const previousSelectedSceneId = useUIStore.getState().selectedSceneId;

    const hasMusic = useMusicStore.getState().objectUrl !== null;
    const isMetronomeEnabled =
      useProjectStore.getState().project?.isMetronomeEnabled ?? false;
    // 作成に失敗したときに戻す先。再生ヘッドを動かすのは曲が無いときだけ
    const previousTime = useMusicStore.getState().currentTime;
    const segmentSeconds = useSettingsStore.getState().defaultSegmentSeconds;

    /** 選んでいるシーン。選ばれていなければ末尾 */
    const source =
      scenes.find((scene) => scene.id === previousSelectedSceneId) ??
      scenes[scenes.length - 1];

    /* 順番だけで作っているときは、**選んでいるシーンの次**へ入れて
       全部を同じ秒数で積み直す。この形では時刻が順番以上のことを
       持たないので、書き換えても失われるものが無い（lib/timelineMode） */
    const newSceneId = randomId();
    const restacked =
      !hasMusic && !isMetronomeEnabled && scenes.length > 0
        ? uniformTimes(
            scenes.flatMap((item) =>
              item.id === source.id ? [item.id, newSceneId] : [item.id],
            ),
            segmentSeconds,
          )
        : null;

    /* シーンがまだ1つも無いときは曲の頭から始める（最初の隊形は
       「曲のこの秒から」ではなく「はじまり」なので）。

       ■ 置き場所の決まり（2026-08-22 に user が決めた形）
       - **曲を鳴らしている最中** … 押した瞬間の再生位置。聴きながら
         「ここ」と思った所に置ける
       - **それ以外** … いま見ているシーンの次

       曲の有無ではなく【いま鳴っているか】で分けている。止まっている
       ときの「いま」は誰にも見えないので、そこを再生位置にすると
       押すまで結果が読めない（それが一度戻した理由）。鳴っている間は
       「いま」がはっきりしていて、聴いている位置がそのまま意図になる */
    /* 曲があるときは**鳴らしている最中しか来ない**（canAddScene）ので、
       ここは常に押した瞬間の位置。**最初の1つも同じ** — イントロが長い
       曲なら、振付が始まるのは0秒ではない。
       曲が無いときだけ、最初は0秒・以降は選んでいるシーンの次 */
    const timeSeconds = hasMusic
      ? insertTimeSeconds(
          scenes,
          useMusicStore.getState().currentTime,
          segmentSeconds,
        )
      : scenes.length === 0
        ? 0
        : restacked
          ? (restacked.get(newSceneId) ?? 0)
          : duplicateTimeSeconds(scenes, source, segmentSeconds);

    const scene = {
      id: newSceneId,
      projectId: project.id,
      // 件数＋1 ではなく「空いているいちばん小さい番号」。3つ作って
      // 真ん中を消すと、件数＋1 は既にある名前とぶつかる(sceneName.ts)
      name: nextSceneName(scenes, t.projects.sceneName),
      // 並び順の正は時刻。order_index は同じ時刻に並んだときの
      // 打ち消し合いを防ぐためだけに残っている
      orderIndex: scenes.length,
      timeSeconds,
    };
    const copiedPositions = Object.values(
      useProjectStore.getState().positionsBySceneId[
        previousSelectedSceneId ?? ""
      ] ?? {},
    ).map((position) => ({ ...position, sceneId: scene.id }));

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    const previousTimes = new Map(
      scenes.map((item) => [item.id, item.timeSeconds]),
    );
    if (restacked) applySceneTimes(restacked);
    addScene(scene);
    for (const position of copiedPositions) {
      updateDancerPosition(scene.id, position.dancerId, position);
    }
    selectScene(scene.id);
    // 増えた場所を一拍光らせる。曲が無いときは**選んでいるシーンの隣**へ
    // 入るので、末尾へ積まれるのを見慣れた目には増えたのが見えない
    useUIStore.getState().markSceneAdded(scene.id);
    // 曲が無いときは再生ヘッドも新しいシーンへ動かす。「増えたのが見えない」
    // への答えで、時間軸のピンクの線が新しいコマの上に立つ。
    //
    // 曲があるときは触らない。時計は<audio>で、ここへ書いても次の
    // timeupdate で上書きされ、鳴っている場所と線がずれるだけになる
    // (シークは audio.currentTime を動かす MusicTimeline / SceneDock の仕事)
    if (!hasMusic) useMusicStore.getState().setCurrentTime(timeSeconds);

    try {
      await persist(async (supabase) => {
        await createScene(supabase, scene);
        await upsertPositions(supabase, copiedPositions);
        // 押しのけたぶんも同じ往復で送る。片方だけ通ると、画面と
        // 保存されているものがずれたまま気づけない
        if (restacked) {
          // 押し出したぶんも同じ往復で送る。片方だけ通ると、画面と
          // 保存されているものがずれたまま気づけない
          await updateSceneTimes(
            supabase,
            scenes
              .filter((item) => restacked.get(item.id) !== item.timeSeconds)
              .map((item) => ({
                id: item.id,
                timeSeconds: restacked.get(item.id)!,
              })),
          );
        }
      });
    } catch (error) {
      removeScene(scene.id);
      if (restacked) applySceneTimes(previousTimes);
      selectScene(previousSelectedSceneId);
      if (!hasMusic) useMusicStore.getState().setCurrentTime(previousTime);
      showToast({
        message: toUserMessage(error, "シーンの作成に失敗しました"),
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  /* 押せるかどうかは**この1つの答え**を3つの入口が読む
     （下のバーの＋ / 一覧の追加 / 空のステージ）。
     各画面で条件を書くと、必ずどこかが取り残される */
  const canAdd = canAddScene({ hasMusic: hasMusicNow, isPlaying });

  return { addScene: handleAddScene, isCreating, canAdd };
}
