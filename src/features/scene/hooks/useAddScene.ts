"use client";

import { useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { createScene } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";
import { randomId } from "@/lib/randomId";
import {
  duplicateTimeSeconds,
  insertTimeSeconds,
} from "@/features/scene/lib/sceneTiming";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

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
  const [isCreating, setIsCreating] = useState(false);
  const scenes = useProjectStore((state) => state.scenes);
  const addScene = useProjectStore((state) => state.addScene);
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
    // 作成に失敗したときに戻す先。再生ヘッドを動かすのは曲が無いときだけ
    const previousTime = useMusicStore.getState().currentTime;
    const segmentSeconds = useSettingsStore.getState().defaultSegmentSeconds;

    // シーンがまだ1つも無いときは曲の頭から始める(最初の隊形は
    // 「曲のこの秒から」ではなく「はじまり」なので)
    const timeSeconds =
      scenes.length === 0
        ? 0
        : hasMusic
          ? // 押した瞬間の再生位置。曲が止まっていればシークした位置になる
            insertTimeSeconds(
              scenes,
              useMusicStore.getState().currentTime,
              segmentSeconds,
            )
          : // 曲が無いときは選択中のシーンの隣。選ばれていなければ末尾の隣
            duplicateTimeSeconds(
              scenes,
              scenes.find((scene) => scene.id === previousSelectedSceneId) ??
                scenes[scenes.length - 1],
              segmentSeconds,
            );

    const scene = {
      id: randomId(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
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
    addScene(scene);
    for (const position of copiedPositions) {
      updateDancerPosition(scene.id, position.dancerId, position);
    }
    selectScene(scene.id);
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
      });
    } catch (error) {
      removeScene(scene.id);
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

  return { addScene: handleAddScene, isCreating };
}
