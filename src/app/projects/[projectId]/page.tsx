import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";

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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {project.title}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        フォーメーションエディタは準備中です。
      </p>
      <Link href="/" className="text-sm underline">
        プロジェクト一覧に戻る
      </Link>
    </div>
  );
}
