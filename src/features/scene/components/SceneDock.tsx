"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  deleteScene,
  renameScene as renameSceneApi,
  updateSceneDuration as updateSceneDurationApi,
  updateSceneOrder,
} from "@/features/scene/api/scenes";
import { SceneTabs } from "@/features/scene/components/SceneTabs";
import { SceneDotRail } from "@/features/scene/components/SceneDotRail";
import { SceneListSheet } from "@/features/scene/components/SceneListSheet";
import { getNextSceneId } from "@/features/scene/lib/playback";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { InlineEditableText } from "@/components/ui/InlineEditableText";
import { Tooltip } from "@/components/ui/Tooltip";
import { DurationSecondsInput } from "@/components/ui/DurationSecondsInput";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";

type Props = {
  project: Project;
};

/** 秒の入力欄が許容する範囲。schema.sqlのCHECK制約(0より大きく30以下)と合わせている */
const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 30;

/**
 * 画面下端に貼り付く、時間軸側の操作一式。上から4段:
 *
 *   1. ハンドル      … シーン一覧シートを開く
 *   2. 選択中シーン行 … 再生 / 名前(インライン編集) / 遷移時間 / 削除
 *   3. ストリップ    … コマを横に並べたもの。切り替えと並び替え
 *   4. ドットレール  … 曲全体のどこにいるか
 *
 * 以前(SceneTimeline)はカードの中に置かれ、ズームボタン・スライダー・
 * 操作バーが縦に積み重なっていた。ドックとして下端に固定し、コマの拡大
 * 縮小のような"読むための操作"はシーン一覧シートへ移したことで、
 * ステージに回せる高さが増えている。
 *
 * 再生(isPlaying)は、選択中シーンから最後のシーンまで自動的に進む
 * シーケンサー。selectSceneを呼ぶと、その瞬間にDraggableDancerIcon側が
 * x/yの変化を検知してtransitionDurationSecondsかけて自分で補間
 * アニメーションを始める(つまり「選択する」ことと「そこへ向けて動き
 * 始める」ことは同時に起きる)。そのためこのシーケンサーは「今のシーンへ
 * 到着するアニメーションが終わるまで待ってから次を選ぶ」を繰り返せばよい。
 * 再生ボタンを押した直後(まだ何のアニメーションも進行していない)だけは
 * 待たずに即座に最初の一歩を進める(justStartedPlayingRefで区別している。
 * ここで律儀に「現在シーンのdurationぶん待つ」をしてしまうと、そもそも
 * まだ動き始めてすらいないのに無意味な間が空いてしまう)。
 */
export function SceneDock({ project }: Props) {
  const { addScene: handleAddScene, isCreating } = useAddScene(project);
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const removeScene = useProjectStore((state) => state.removeScene);
  const renameScene = useProjectStore((state) => state.renameScene);
  const reorderScenes = useProjectStore((state) => state.reorderScenes);
  const updateSceneDuration = useProjectStore(
    (state) => state.updateSceneDuration,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);

  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;

  const commitRename = async (scene: Scene, name: string) => {
    const previousName = scene.name;
    renameScene(scene.id, name);

    try {
      const supabase = createClient();
      await renameSceneApi(supabase, scene.id, name);
    } catch (error) {
      renameScene(scene.id, previousName);
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
        orderedSceneIds.map((id, index) => updateSceneOrder(supabase, id, index)),
      );
    } catch (error) {
      reorderScenes(previousOrder);
      showToast({
        message: toUserMessage(error, "シーンの並び替えに失敗しました"),
        type: "error",
      });
    }
  };

  const handleDurationChange = async (seconds: number) => {
    if (!selectedScene) return;
    const previousDuration = selectedScene.transitionDurationSeconds;
    updateSceneDuration(selectedScene.id, seconds);

    try {
      const supabase = createClient();
      await updateSceneDurationApi(supabase, selectedScene.id, seconds);
    } catch (error) {
      updateSceneDuration(selectedScene.id, previousDuration);
      showToast({
        message: toUserMessage(error, "遷移時間の変更に失敗しました"),
        type: "error",
      });
    }
  };

  // 再生ボタンを押した直後の1歩目だけは待たずに動き始めるための目印。
  // 押した瞬間(false→trueに切り替える側)でtrueにし、シーケンサー側で
  // 読んだら即falseに戻す(詳しくは上のコンポーネント doc コメント参照)
  const justStartedPlayingRef = useRef(false);

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

  const handleDelete = (scene: Scene) => {
    // このシーンに何人ぶんの配置が入っているかを数えて見せる
    const dancerCount = Object.keys(positionsBySceneId[scene.id] ?? {}).length;

    requestConfirm({
      title: `「${scene.name}」を削除しますか?`,
      description:
        "このシーンの配置と、ここへ入る導線も一緒に消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      meta: [`${dancerCount} 人の配置`],
      onConfirm: async () => {
        try {
          const supabase = createClient();
          await deleteScene(supabase, scene.id);
          removeScene(scene.id);
          const remaining = scenes.filter((s) => s.id !== scene.id);
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

  const handleSelectScene = (sceneId: string) => {
    // 再生中に手動でシーンを選んだら再生を止める(取りこぼしのない
    // 一貫した挙動にするため。クリック・レール・並び替えのどれ経由でも同じ)
    setIsPlaying(false);
    selectScene(sceneId);
  };

  return (
    <div className="rounded-t-[18px] border-t border-zinc-800 bg-zinc-900 pt-2 pb-3">
      <button
        type="button"
        onClick={() => setSceneSheetOpen(true)}
        aria-label="シーン一覧を開く"
        className="mx-auto mb-2.5 block px-6 py-1"
      >
        <span
          aria-hidden
          className="block h-1 w-9 rounded-full bg-zinc-700"
        />
      </button>

      {selectedScene && (
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "再生を停止" : "最後のシーンまで再生"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white"
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <InlineEditableText
              key={selectedScene.id}
              value={selectedScene.name}
              onCommit={(name) => commitRename(selectedScene, name)}
              label="シーン名"
              textClassName="text-sm font-semibold"
              prefix={
                <span className="shrink-0 font-mono text-[11px] font-semibold text-pink-400">
                  S{selectedIndex + 1}
                </span>
              }
            />
            <div className="mt-1.5">
              <DurationSecondsInput
                key={selectedScene.id}
                label="遷移時間(秒)"
                value={selectedScene.transitionDurationSeconds}
                // シーン自体の遷移時間は必須値(空欄にはできない)なので
                // allowEmpty={false}にしている
                allowEmpty={false}
                onCommit={(value) => {
                  if (value !== null) handleDurationChange(value);
                }}
                min={MIN_DURATION_SECONDS}
                max={MAX_DURATION_SECONDS}
                suffix="秒でここへ"
              />
            </div>
          </div>

          <Tooltip label="シーンを削除" placement="top" align="right">
          <button
            type="button"
            onClick={() => handleDelete(selectedScene)}
            aria-label="シーンを削除"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-950 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
          </Tooltip>
        </div>
      )}

      <SceneTabs
        scenes={scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={handleSelectScene}
        onAddScene={handleAddScene}
        onReorderScenes={handleReorderScenes}
        isCreating={isCreating}
        dancers={dancers}
        positionsBySceneId={positionsBySceneId}
        stageWidthUnits={project.stageWidth}
        stageHeightUnits={project.stageHeight}
      />

      <SceneDotRail
        scenes={scenes}
        selectedIndex={selectedIndex}
        isPlaying={isPlaying}
        onSelectIndex={(index) => {
          const scene = scenes[index];
          if (scene) handleSelectScene(scene.id);
        }}
      />

      {/* 画面全体に重なるシート。DOM上の位置は見た目に影響しないので、
          改名・削除・並び替えの処理を持っているここから描く */}
      <SceneListSheet
        project={project}
        onRenameScene={commitRename}
        onDeleteScene={handleDelete}
        onReorderScenes={handleReorderScenes}
      />
    </div>
  );
}
