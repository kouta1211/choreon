import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { EditorLayout } from "@/components/templates/EditorLayout";

/**
 * 保存済みのプロジェクトを開くエディタ。
 *
 * ここはデータを取ってくるだけで、画面の組み立ては EditorLayout に任せる。
 * 未ログインの下書き(トップページ)と同じ画面を出すため、配置を2箇所に
 * 持たせない。
 *
 * 取得結果に user_id の絞り込みが無いのは、RLSのポリシー
 * (auth.uid() = user_id)が境界になっているため。他人のIDを直接叩いても
 * 行が返らず notFound() になり、存在の有無も漏れない。
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
    <EditorLayout
      project={project}
      initialDancers={dancers}
      initialScenes={scenes}
      initialPositions={positions}
    />
  );
}
