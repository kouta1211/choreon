import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/features/project/api/projects";
import { listDancers } from "@/features/dancer/api/dancers";
import { listScenes } from "@/features/scene/api/scenes";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { getSharedProject } from "@/features/viewer/api/sharedProject";
import { ViewerLayout } from "@/components/templates/ViewerLayout";

/**
 * チャットに貼られたときの見え方。
 *
 * ■ 検索エンジンには拾わせない
 * 共有リンクは「知っている人だけが開ける」ことで守られているので、
 * どこかに貼られたリンクが索引に載ると、その前提が崩れる。
 * 索引を断ることと、チャットで作品名が見えることは別の話で、
 * 後者はリンクを配る側が望んでいること。
 *
 * ■ 作品名を出す
 * 「これ何のリンクだっけ」を稽古の直前に起こさせない。名前が読めるのは
 * **既にリンク(＝中身を見る鍵)を持っている人**だけなので、これで新しく
 * 漏れるものは無い。トークンが無効なら既定の名前に落とす — 当てずっぽうの
 * トークンに対して「その作品はある」と教えないため。
 */
export async function generateMetadata(
  props: PageProps<"/view/[projectId]">,
): Promise<Metadata> {
  const robots = { index: false, follow: false } as const;
  const search = await props.searchParams;
  const token = typeof search?.t === "string" ? search.t : null;
  if (!token) return { robots };

  const supabase = await createClient();
  const shared = await getSharedProject(supabase, token);
  const { projectId } = await props.params;
  if (!shared || shared.project.id !== projectId) return { robots };

  const title = `${shared.project.title} — Choreon`;
  return {
    robots,
    title,
    openGraph: { title },
    twitter: { title },
  };
}

/**
 * 閲覧専用のビューア。稽古場でダンサーがスマホから見る画面。
 *
 * 取ってくるものはエディタと同じで、渡す先が編集の操作を持たない層
 * (ViewerLayout)になる。
 *
 * ■ 入り方は2つ
 * 1. 持ち主が自分で開く — RLS(auth.uid() = user_id)が境界。
 * 2. 共有リンク `?t=<トークン>` で開く — テーブルは閉じたままで、
 *    トークンを検査する関数だけを通る(features/viewer/api/sharedProject)。
 *    共有がオフの作品や、当てずっぽうのトークンでは何も返らない。
 *
 * どちらでもない相手には notFound()。「権限がありません」と返すと、
 * その先に作品があること自体を教えてしまう。
 *
 * `?p=<dancerId>` を付けると、開いた時点でそのポジションが選ばれる。
 * 振付師が一人ひとりに違うリンクを配れるようにするため。
 */
export default async function ViewerPage(props: PageProps<"/view/[projectId]">) {
  const { projectId } = await props.params;
  const search = await props.searchParams;
  const supabase = await createClient();

  const token = typeof search?.t === "string" ? search.t : null;
  const requested = typeof search?.p === "string" ? search.p : null;

  // 共有リンクで来た人を先に扱う。ログインしている人が他人の共有リンクを
  // 開くこともあるので、「ログインの有無」ではなく【トークンの有無】で分ける
  if (token) {
    const shared = await getSharedProject(supabase, token);
    if (!shared || shared.project.id !== projectId) {
      notFound();
    }

    return (
      <ViewerLayout
        project={shared.project}
        dancers={shared.dancers}
        scenes={shared.scenes}
        positions={shared.positions}
        requestedDancerId={requested}
      />
    );
  }

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

  return (
    <ViewerLayout
      project={project}
      dancers={dancers}
      scenes={scenes}
      positions={positions}
      requestedDancerId={requested}
    />
  );
}
