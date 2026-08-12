import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { ViewerLayout } from "@/components/templates/ViewerLayout";

/**
 * 閲覧専用のビューア。稽古場でダンサーがスマホから見る画面。
 *
 * 取ってくるものはエディタと同じで、渡す先が編集の操作を持たない層
 * (ViewerLayout)になる。
 *
 * ■ いま見られるのは作品の持ち主だけ
 * RLSのポリシー(auth.uid() = user_id)が境界なので、他人のIDを直接
 * 叩いても行が返らず notFound() になる。第三者へ配れる共有リンクは、
 * 先に RLS とサーバー経由の器を決めてから足す(そこを決める前にUIだけ
 * 作ると、作り直しになる)。
 *
 * `?p=<dancerId>` を付けると、開いた時点でそのポジションが選ばれる。
 * 振付師が一人ひとりに違うリンクを配れるようにするため。
 */
export default async function ViewerPage(props: PageProps<"/view/[projectId]">) {
  const { projectId } = await props.params;
  const search = await props.searchParams;
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
    listScenes(supabase, projectId),
  ]);

  const positions = await listPositionsByScenes(
    supabase,
    scenes.map((scene) => scene.id),
  );

  const requested = search?.p;
  return (
    <ViewerLayout
      project={project}
      dancers={dancers}
      scenes={scenes}
      positions={positions}
      requestedDancerId={typeof requested === "string" ? requested : null}
    />
  );
}
