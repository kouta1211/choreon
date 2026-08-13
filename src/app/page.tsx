import { createClient } from "@/lib/supabase/server";
import { listProjectSummaries } from "@/features/project/api/projects";
import { ProjectList } from "@/components/organisms/ProjectList";
import { CreateProjectForm } from "@/components/organisms/CreateProjectForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { GuestEditor } from "@/components/organisms/GuestEditor";
import { AppHeader } from "@/components/molecules/AppHeader";
import { ThemeButton } from "@/components/organisms/ThemeButton";

/**
 * トップページ。ログインしているかどうかで役割が変わる。
 *
 * - 未ログイン: いきなりエディタ(ゲストモード)。登録を求める前に、
 *   まず作ってもらう。保存しようとした時点で初めて登録の壁が出る
 * - ログイン済み: プロジェクト一覧
 *
 * 以前はproxy(middleware)が未ログインを全て/loginへ飛ばしていたため、
 * 何のアプリかを見る前にアカウントを作るかどうかを判断させていた。
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestEditor />;
  }

  const projects = await listProjectSummaries(supabase);

  return (
    <div className="flex flex-1 flex-col px-gutter pb-gutter-lg">
      <div className="mx-auto flex w-full max-w-md flex-col gap-gutter-lg md:max-w-3xl">
        <AppHeader>
          <div className="flex items-center gap-unit">
            <ThemeButton />
            <SignOutButton />
          </div>
        </AppHeader>

        <CreateProjectForm userId={user.id} />

        <ProjectList projects={projects} />
      </div>
    </div>
  );
}
