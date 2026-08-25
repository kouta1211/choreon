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

  // 【作品を先に引く】。まとめて取ると、権限が無い相手にはダンサーの
  // 問い合わせが「そんな権限は無い」(42501)で例外になり、404 で済むはずの
  // ところが 500 になる。500 は「その先に何かある」ことを教えてしまうし、
  // 画面にもエラーが出る。存在しないものとして静かに閉じる
  const project = await getProject(supabase, projectId);
  if (!project) {
    notFound();
  }

  const [dancers, scenes] = await Promise.all([
    listDancers(supabase, projectId),
    // 秒は載せ方から導く。作品を読んでからでないとシーンを組み立てられない
    listScenes(supabase, projectId, project.musicPlacements),
  ]);

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
