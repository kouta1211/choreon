import { createClient } from "@/lib/supabase/server";
import { listProjectSummaries } from "@/features/project/api/projects";
import { ProjectList } from "@/components/organisms/ProjectList";
import { CreateProjectForm } from "@/components/organisms/CreateProjectForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppHeader } from "@/components/molecules/AppHeader";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン時はproxy(middleware)側で/loginへリダイレクトされるため、
  // ここに到達する時点でuserは必ず存在する
  if (!user) return null;

  const projects = await listProjectSummaries(supabase);

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4 md:max-w-3xl">
        <AppHeader>
          <SignOutButton />
        </AppHeader>

        <CreateProjectForm userId={user.id} />

        <ProjectList projects={projects} />
      </div>
    </div>
  );
}
