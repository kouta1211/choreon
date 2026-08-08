"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  createScene,
  deleteScene,
  renameScene as renameSceneApi,
  updateSceneDuration as updateSceneDurationApi,
  updateSceneOrder,
} from "@/features/scene/api/scenes";
import { upsertPosition } from "@/features/scene/api/positions";
import { SceneTabs } from "@/features/scene/components/SceneTabs";
import { SceneActionsBar } from "@/features/scene/components/SceneActionsBar";
import { getNextSceneId } from "@/features/scene/lib/playback";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/** シーンの一覧タブ+追加ボタン+再生。選択中シーンには名前変更・遷移時間・削除の
 * 操作行が出る(並び替えはSceneTabs側でサムネイルを直接ドラッグして行う)。
 *
 * 再生(isPlaying)は、選択中シーンから最後のシーンまで自動的に進むシーケンサー。
 * selectSceneを呼ぶと、その瞬間にDraggableDancerIcon側がx/yの変化を検知して
 * transitionDurationSecondsかけて自分で補間アニメーションを始める(つまり
 * 「選択する」ことと「そこへ向けて動き始める」ことは同時に起きる)。そのため
 * このシーケンサーは「今のシーンへ到着するアニメーションが終わるまで待ってから
 * 次を選ぶ」を繰り返せばよい。再生ボタンを押した直後(まだ何のアニメーションも
 * 進行していない)だけは待たずに即座に最初の一歩を進める
 * (justStartedPlayingRefで区別している。ここで律儀に「現在シーンのdurationぶん
 * 待つ」をしてしまうと、そもそもまだ動き始めてすらいないのに無意味な間が
 * 空いてしまう) */
export function SceneTimeline({ project }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const addScene = useProjectStore((state) => state.addScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const renameScene = useProjectStore((state) => state.renameScene);
  const reorderScenes = useProjectStore((state) => state.reorderScenes);
  const updateSceneDuration = useProjectStore(
    (state) => state.updateSceneDuration,
  );
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);

  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;

  const handleAddScene = async () => {
    setIsCreating(true);
    const previousSelectedSceneId = selectedSceneId;
    const scene = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `シーン${scenes.length + 1}`,
      orderIndex: scenes.length,
      // DBのdefault(1秒)と合わせている
      transitionDurationSeconds: 1,
    };
    // 新しいシーンは空(ダンサーが誰もいない)状態からではなく、直前に見ていた
    // シーンの配置をそのままコピーして始める。フォーメーションは通常シーンごとに
    // 少しずつ変化していくものなので、毎回ゼロから配置し直すのは不自然なため
    // (これによりシーン切り替え時のなめらかな移動アニメーションも活きる)
    const copiedPositions = Object.values(
      positionsBySceneId[previousSelectedSceneId ?? ""] ?? {},
    ).map((position) => ({ ...position, sceneId: scene.id }));

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したら取り消す
    addScene(scene);
    for (const position of copiedPositions) {
      updateDancerPosition(scene.id, position.dancerId, position);
    }
    selectScene(scene.id);

    try {
      const supabase = createClient();
      await createScene(supabase, scene);
      for (const position of copiedPositions) {
        await upsertPosition(supabase, position);
      }
    } catch {
      removeScene(scene.id);
      selectScene(previousSelectedSceneId);
      showToast({ message: "シーンの作成に失敗しました", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const commitRename = async (name: string) => {
    if (!selectedScene) return;

    const previousName = selectedScene.name;
    renameScene(selectedScene.id, name);

    try {
      const supabase = createClient();
      await renameSceneApi(supabase, selectedScene.id, name);
    } catch (error) {
      renameScene(selectedScene.id, previousName);
      showToast({
        message: toUserMessage(error, "シーン名の変更に失敗しました"),
        type: "error",
      });
    }
  };

  // SceneTabs側でドラッグして並び替えた結果(新しい順番のID配列)を受け取り、
  // 各シーンのorderIndexを配列内の位置に合わせて一括で更新する
  const handleReorderScenes = async (orderedSceneIds: string[]) => {
    const previousOrder = scenes.map((s) => s.id);
    reorderScenes(orderedSceneIds);

    try {
      const supabase = createClient();
      await Promise.all(
        orderedSceneIds.map((id, index) =>
          updateSceneOrder(supabase, id, index),
        ),
      );
    } catch {
      reorderScenes(previousOrder);
      showToast({ message: "シーンの並び替えに失敗しました", type: "error" });
    }
  };

  const handleDurationChange = async (seconds: number) => {
    if (!selectedScene) return;
    const previousDuration = selectedScene.transitionDurationSeconds;
    updateSceneDuration(selectedScene.id, seconds);

    try {
      const supabase = createClient();
      await updateSceneDurationApi(supabase, selectedScene.id, seconds);
    } catch {
      updateSceneDuration(selectedScene.id, previousDuration);
      showToast({ message: "遷移時間の変更に失敗しました", type: "error" });
    }
  };

  // 再生ボタンを押した直後の1歩目だけは待たずに動き始めるための目印。
  // 押した瞬間(false→trueに切り替える側)でtrueにし、シーケンサー側で
  // 読んだら即falseに戻す(詳しくは上のコンポーネント doc コメント参照)
  const justStartedPlayingRef = useRef(false);

  // 再生シーケンサー: isPlaying中、selectedSceneIdが変わるたびに実行される。
  // 「今のシーンへの到着アニメーションが終わる頃(=今のシーン自身の
  // transitionDurationSecondsが経過した頃)」に、次のシーンを選ぶか
  // (次が無ければ)再生を止める。selectSceneを呼ぶこと自体が次の
  // アニメーションの開始トリガーになるため、「待ってから進める」を
  // 繰り返すだけで、待ち時間とアニメーション時間が二重にならず1回分で済む。
  // 「再生を止める」までこの待ちを挟んでいるのは、最後のシーンへの
  // アニメーションがまだ途中なのに再生ボタンの見た目だけ先に「停止」に
  // 戻ってしまうのを防ぐため。isPlayingがfalseになった時・selectedSceneIdが
  // (手動選択などで)変わった時は、クリーンアップで直前のタイマーを
  // 確実に破棄する
  useEffect(() => {
    if (!isPlaying) return;

    const isFirstStep = justStartedPlayingRef.current;
    justStartedPlayingRef.current = false;
    const currentScene = scenes.find((scene) => scene.id === selectedSceneId);
    const delayMs = isFirstStep
      ? 0
      : (currentScene?.transitionDurationSeconds ?? 0) * 1000;
    const nextSceneId = getNextSceneId(scenes, selectedSceneId);

    const timer = setTimeout(() => {
      if (nextSceneId) {
        selectScene(nextSceneId);
      } else {
        setIsPlaying(false);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isPlaying, selectedSceneId, scenes, selectScene, setIsPlaying]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      justStartedPlayingRef.current = true;
    }
    setIsPlaying(!isPlaying);
  };

  const handleDelete = () => {
    if (!selectedScene) return;
    // このシーンに何人ぶんの配置が入っているかを数えて見せる
    const dancerCount = Object.keys(
      positionsBySceneId[selectedScene.id] ?? {},
    ).length;

    requestConfirm({
      title: `「${selectedScene.name}」を削除しますか?`,
      description:
        "このシーンの配置と、ここへ入る導線も一緒に消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      meta: [`${dancerCount} 人の配置`],
      onConfirm: async () => {
        try {
          const supabase = createClient();
          await deleteScene(supabase, selectedScene.id);
          removeScene(selectedScene.id);
          const remaining = scenes.filter((s) => s.id !== selectedScene.id);
          selectScene(remaining[0]?.id ?? null);
        } catch (error) {
          showToast({
            message: toUserMessage(error, "シーンの削除に失敗しました"),
            type: "error",
          });
        }
      },
    });
  };

  return (
    <div className="space-y-2">
      <SceneTabs
        scenes={scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={(sceneId) => {
          // 再生中に手動でシーンを選んだら再生を止める(取りこぼしのない
          // 一貫した挙動にするため。クリック・スライダー・並び替えのどれ
          // 経由でも同じ)
          setIsPlaying(false);
          selectScene(sceneId);
        }}
        onAddScene={handleAddScene}
        onReorderScenes={handleReorderScenes}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        isCreating={isCreating}
        dancers={dancers}
        positionsBySceneId={positionsBySceneId}
        stageWidthUnits={project.stageWidth}
        stageHeightUnits={project.stageHeight}
      />

      {selectedScene && (
        <SceneActionsBar
          name={selectedScene.name}
          onRename={commitRename}
          onDelete={handleDelete}
          durationSeconds={selectedScene.transitionDurationSeconds}
          onDurationCommit={handleDurationChange}
        />
      )}
    </div>
  );
}
