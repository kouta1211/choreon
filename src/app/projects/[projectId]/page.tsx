import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { CanvasBoard } from "@/features/canvas/components/CanvasBoard";
import { EditorHeader } from "@/features/canvas/components/EditorHeader";
import { AddDancerSheet } from "@/features/dancer/components/AddDancerSheet";
import { DancerInspector } from "@/features/dancer/components/DancerInspector";
import { SceneDock } from "@/features/scene/components/SceneDock";

/**
 * エディタ画面。ページ自体はスクロールさせず、画面の高さ(h-dvh)に
 * 収まる縦3ブロックで組む。
 *
 *   ヘッダー / 表示セグメント  … 高さ固定
 *   ステージ                  … flex-1(余った高さを全部もらう)
 *   インスペクター / ドック    … 高さ固定、下端に貼り付く
 *
 * 以前は全体を縦に積んでスクロールさせていたため、スマートフォンでは
 * 「タイムラインを見るとステージが画面外」「ステージを見るとタイムラインが
 * 画面外」という状態になり、このアプリの主目的である
 * 「時間軸と空間を同時に見る」ができていなかった。
 *
 * min-h-0 が随所に入っているのは、flexアイテムが既定で
 * min-height:auto = 中身より小さくならないため。これが無いと
 * ステージがドックを画面外へ押し出す。
 */
export default async function ProjectPage(
  props: PageProps<"/projects/[projectId]">,
) {
  const { projectId } = await props.params;
  const supabase = await createClient();

  const [project, dancers, scenes] = await Promise.all([
    getProject(supabase, projectId),
    listDancers(supabase, projectId),
    listScenes(supabase, projectId),
  ]);

  if (!project) {
    notFound();
  }

  const positions = await listPositionsByScenes(
    supabase,
    scenes.map((scene) => scene.id),
  );

  return (
    <div className="flex h-dvh flex-col overflow-clip">
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col overflow-clip">
        <EditorHeader project={project} />

        <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-1">
          <CanvasBoard
            project={project}
            initialDancers={dancers}
            initialScenes={scenes}
            initialPositions={positions}
          />
        </div>

        {/* インスペクターはドックの直上に浮かせる(absolute)ため、
            位置の基準としてこのラッパーが要る */}
        <div className="relative shrink-0">
          <DancerInspector />
          <SceneDock project={project} />
        </div>
        <AddDancerSheet project={project} />
      </div>
    </div>
  );
}
