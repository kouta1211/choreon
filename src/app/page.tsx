import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/features/project/api/projects";
import { ProjectList } from "@/features/project/components/ProjectList";
import { CreateProjectForm } from "@/features/project/components/CreateProjectForm";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { Card } from "@/components/ui/Card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン時はproxy(middleware)側で/loginへリダイレクトされるため、
  // ここに到達する時点でuserは必ず存在する
  if (!user) return null;

  const projects = await listProjects(supabase);

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Choreon
          </h1>
          <SignOutButton />
        </div>

        <Card>
          <CreateProjectForm userId={user.id} />
        </Card>

        <ProjectList projects={projects} />
      </div>
    </div>
  );
}
