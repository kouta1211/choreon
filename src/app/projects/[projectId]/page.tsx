import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { CanvasBoard } from "@/features/canvas/components/CanvasBoard";
import { AddDancerForm } from "@/features/dancer/components/AddDancerForm";
import { SceneTimeline } from "@/features/scene/components/SceneTimeline";
import { Toast } from "@/features/canvas/components/Toast";

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
    <div className="flex flex-1 flex-col gap-4 bg-zinc-50 px-4 py-6 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          {project.title}
        </h1>
        <Link href="/" className="text-sm underline">
          プロジェクト一覧に戻る
        </Link>
      </div>
      <SceneTimeline project={project} />
      <AddDancerForm project={project} />
      <CanvasBoard
        project={project}
        initialDancers={dancers}
        initialScenes={scenes}
        initialPositions={positions}
      />
      <Toast />
    </div>
  );
}
