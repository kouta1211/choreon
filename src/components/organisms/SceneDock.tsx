"use client";

import { useEffect, useRef } from "react";
import { List, Pause, Play, Plus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { SceneTabs } from "@/components/molecules/SceneTabs";
import { SceneDotRail } from "@/components/molecules/SceneDotRail";
import { SceneListSheet } from "@/components/organisms/SceneListSheet";
import { getNextSceneId } from "@/features/scene/lib/playback";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * 画面下端に貼り付く、時間軸側の操作。3段:
 *
 *   1. 再生 / いま何番のどのシーンか / シーンを追加 / 一覧を開く
 *   2. ストリップ … コマを横に並べたもの。切り替えと並び替え、×で削除
 *   3. ドットレール … 曲全体のどこにいるか
 *
 * ここは【見る場所】に徹していて、シーン名や遷移時間を書き換える操作は
 * 持たない。それらはシーン一覧(SceneList)のカードにある。
 *
 * ストリップには以前「横スクロールで止まった位置のシーンを自動選択する」
 * 処理があり、一覧を眺めようと指で払っただけで選択が変わって再生も
 * 止まっていた。その処理だけを外してあり、いまはタップと並び替えしか
 * 反応しない(SceneTabs のコメント参照)。
 *
 * 一覧のボタンは狭い画面だけに出す(md:hidden)。広い画面では
 * シーン一覧が横のサイドバーに常時出ていて、そちらに同じ操作があるため。
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
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);
  const { reorderTo, confirmDelete, selectSceneManually } = useSceneActions();

  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;

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

  return (
    <div className="rounded-t-[calc(var(--radius)*1.5)] border-t border-line bg-surface pt-2.5 pb-3 md:rounded-none">
      {/* シーンが1つも無い状態でも、追加と一覧のボタンだけは出す
          (ここから作り始めるため。以前はストリップの中に「+」があった) */}
      <div className="flex items-center gap-2.5 px-3.5">
        {selectedScene ? (
          <>
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "再生を停止" : "最後のシーンまで再生"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>

            {/* いま何を見ているかの表示。押せる要素にしていないのは、
                ここが唯一「操作ではないもの」だと形で分かるようにするため */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="shrink-0 font-mono text-[11px] font-semibold text-accent-soft">
                  {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-fg-strong">
                  {selectedScene.name}
                </span>
              </div>
              <span className="mt-0.5 block font-mono text-[10.5px] text-fg-muted">
                {selectedIndex === 0
                  ? "先頭のシーン"
                  : `${selectedScene.transitionDurationSeconds}秒でここへ`}
              </span>
            </div>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-[13px] text-fg-muted">
            シーンがありません
          </span>
        )}

        <button
          type="button"
          onClick={handleAddScene}
          disabled={isCreating}
          aria-label="シーンを追加"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.75)] border border-line-strong text-fg-sub disabled:opacity-50"
        >
          <Plus size={17} />
        </button>

        {/* 以前はここが無地の細いバーで、押せることも、押すと何が出るのかも
            分からなかった。文字を出して行き先を名指しする */}
        <button
          type="button"
          onClick={() => setSceneSheetOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)*0.75)] border border-line-strong px-2.5 text-[13px] font-medium whitespace-nowrap text-fg-sub md:hidden"
        >
          <List size={15} className="shrink-0" />
          一覧
        </button>
      </div>

      {/* 曲の流れを左から右へ一望するストリップ */}
      <div className="mt-2.5">
        <SceneTabs
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          onSelectScene={selectSceneManually}
          onReorderScenes={reorderTo}
          onDeleteScene={confirmDelete}
          thumbnailBySceneId={thumbnailBySceneId}
          stageWidthUnits={project.stageWidth}
          stageHeightUnits={project.stageHeight}
        />
      </div>

      <SceneDotRail
        scenes={scenes}
        selectedIndex={selectedIndex}
        isPlaying={isPlaying}
        onSelectIndex={(index) => {
          const scene = scenes[index];
          if (scene) selectSceneManually(scene.id);
        }}
      />

      {/* 画面全体に重なるシート(狭い画面用)。DOM上の位置は見た目に
          影響しないのでここから描く。広い画面では一覧ボタンを出さないため
          開かれることがなく、代わりにステージ横のサイドバーが担う */}
      <SceneListSheet project={project} />
    </div>
  );
}
