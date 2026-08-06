import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { CanvasBoard } from "@/features/canvas/components/CanvasBoard";
import { AddDancerForm } from "@/features/dancer/components/AddDancerForm";

export default async function ProjectPage(
  props: PageProps<"/projects/[projectId]">,
) {
  const { projectId } = await props.params;
  const supabase = await createClient();
  const project = await getProject(supabase, projectId);

  if (!project) {
    notFound();
  }

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
      <AddDancerForm project={project} />
      <CanvasBoard project={project} />
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        ※ダンサーの追加・移動はまだこの端末内のみに保存され、リロードすると消えます(Supabase連携は未実装)
      </p>
    </div>
  );
}
