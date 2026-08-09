"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { SceneTabs } from "@/components/molecules/SceneTabs";
import { SceneDotRail } from "@/components/molecules/SceneDotRail";
import { SceneListSheet } from "@/components/organisms/SceneListSheet";
import { getNextSceneId } from "@/features/scene/lib/playback";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import { Tooltip } from "@/components/atoms/Tooltip";
import { DurationSecondsInput } from "@/components/molecules/DurationSecondsInput";
import type { Project } from "@/features/project/types";

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
 * 画面が広いとき(lg以上)は 1 と 3 を出さない。シーン一覧が横の
 * サイドバーに常時出ており、開くためのハンドルも、横に流れるコマ送りも
 * 役割が重複するため。残る再生・シーン名・レールは、幅があっても
 * 下端にある方が押しやすい。
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
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);
  const { renameSceneTo, reorderTo, changeDuration, confirmDelete, selectSceneManually } =
    useSceneActions();

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
    <div className="rounded-t-[calc(var(--radius)*1.5)] border-t border-line bg-surface pt-2 pb-3 md:rounded-none">
      <button
        type="button"
        onClick={() => setSceneSheetOpen(true)}
        aria-label="シーン一覧を開く"
        className="mx-auto mb-2.5 block px-6 py-1 md:hidden"
      >
        <span
          aria-hidden
          className="block h-1 w-9 rounded-full bg-line-strong"
        />
      </button>

      {selectedScene && (
        // 名前の欄は狭い画面では余白を埋めるが、広い画面では中身の幅に
        // とどめる。伸ばすとシーン名とゴミ箱が1000px以上離れ、互いに
        // 無関係な要素に見えるため
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5">
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

          <div className="min-w-0 flex-1 md:flex-none">
            <InlineEditableText
              key={selectedScene.id}
              value={selectedScene.name}
              onCommit={(name) => renameSceneTo(selectedScene, name)}
              label="シーン名"
              textClassName="text-sm font-semibold"
              prefix={
                <span className="shrink-0 font-mono text-[11px] font-semibold text-accent-soft">
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
                  if (value !== null) changeDuration(selectedScene, value);
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
            onClick={() => confirmDelete(selectedScene)}
            aria-label="シーンを削除"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-red-950 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
          </Tooltip>
        </div>
      )}

      <div className="md:hidden">
      <SceneTabs
        scenes={scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={selectSceneManually}
        onAddScene={handleAddScene}
        onReorderScenes={reorderTo}
        isCreating={isCreating}
        dancers={dancers}
        positionsBySceneId={positionsBySceneId}
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
          影響しないのでここから描く。広い画面ではハンドルを出さないため
          開かれることがなく、代わりにステージ横のサイドバーが担う */}
      <SceneListSheet project={project} />
    </div>
  );
}
