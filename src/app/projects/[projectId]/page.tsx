import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { CanvasBoard } from "@/features/canvas/components/CanvasBoard";
import { EditorHeader } from "@/features/canvas/components/EditorHeader";
import { AddDancerSheet } from "@/features/dancer/components/AddDancerSheet";
import { TemplateSheet } from "@/features/canvas/components/TemplateSheet";
import { TemplateHint } from "@/features/canvas/components/TemplateHint";
import { DancerInspector } from "@/features/dancer/components/DancerInspector";
import { SceneDock } from "@/features/scene/components/SceneDock";
import { SceneSidebar } from "@/features/scene/components/SceneSidebar";
import { EditorSidePanel } from "@/features/canvas/components/EditorSidePanel";
import { EditorShortcuts } from "@/features/canvas/components/EditorShortcuts";

/**
 * エディタ画面。ページ自体はスクロールさせず、画面の高さ(h-dvh)に
 * 収まる形で組む。幅によって3通り:
 *
 *   〜767px   1カラム … ステージ + 下部ドック。シーンとダンサーはシートで開く
 *   768〜1199 2ペイン … ステージ + 右パネル(シーン/ダンサーをタブで切替)
 *   1200px〜  3ペイン … 左レール(シーン) + ステージ + 右パネル(ダンサー)
 *
 * 最下端に貼り付けないのは、iOSのホームバーやWindowsのタスクバーと
 * 再生ボタンが重なるため(env(safe-area-inset-bottom)、最低24px)。
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
    <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-clip md:max-[1199px]:max-w-3xl min-[1200px]:max-w-[1400px]">
        <EditorHeader project={project} />

        <div className="flex min-h-0 flex-1 gap-3 px-3.5 pb-1 md:gap-4 md:px-4">
          {/* 3ペインのときだけ、シーンを左のレールに出す */}
          <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
            <SceneSidebar project={project} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <CanvasBoard
              project={project}
              initialDancers={dancers}
              initialScenes={scenes}
              initialPositions={positions}
            />
          </div>

          {/* 2ペインはシーン/ダンサーをタブで、3ペインはダンサー専用。
              どちらを出すかはCSSでしか判定できないため両方描いて切り替える
              「768以上かつ1199以下」を範囲で指定している。
              `md:flex` と `min-[1200px]:hidden` を並べる書き方では、
              どちらが後にCSSへ出るかに結果が左右されてしまう
              (テーマに足したブレークポイントは md より前に出た) */}
          <div className="hidden md:max-[1199px]:flex md:max-[1199px]:min-h-0">
            <EditorSidePanel project={project} showScenes />
          </div>
          <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
            <EditorSidePanel project={project} showScenes={false} />
          </div>
        </div>

        {/* インスペクターはドックの直上に浮かせる(absolute)ため、
            位置の基準としてこのラッパーが要る */}
        {/* インスペクターとヒントはドックの直上に浮かせる(absolute)ため、
            位置の基準としてこのラッパーが要る。ダンサーを選んでいる間は
            インスペクターが同じ場所を使うので、ヒントは出さない */}
        <div className="relative shrink-0">
          <TemplateHint />
          <DancerInspector />
          <SceneDock project={project} />
        </div>

        <AddDancerSheet project={project} />
        <TemplateSheet project={project} />
        <EditorShortcuts />
      </div>
    </div>
  );
}
