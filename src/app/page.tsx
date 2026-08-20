import { createClient } from "@/lib/supabase/server";
import { listProjectSummaries } from "@/features/project/api/projects";
import { ProjectList } from "@/components/organisms/ProjectList";
import { NewProjectButton } from "@/components/organisms/NewProjectButton";
import { SettingsButton } from "@/components/organisms/SettingsButton";
import { WelcomeGate } from "@/components/organisms/WelcomeGate";
import { AppHeader } from "@/components/molecules/AppHeader";
import { ThemeButton } from "@/components/organisms/ThemeButton";

/**
 * トップページ。ログインしているかどうかで役割が変わる。
 *
 * - 未ログイン: 始め方を選ぶ画面 → ゲストのエディタ。登録を求める前に、
 *   まず作ってもらう。保存しようとした時点で初めて登録の壁が出る
 * - ログイン済み: プロジェクト一覧
 *
 * 以前はproxy(middleware)が未ログインを全て/loginへ飛ばしていたため、
 * 何のアプリかを見る前にアカウントを作るかどうかを判断させていた。
 * その後いきなりエディタを出す形にしたが、今度は**始め方が選択に
 * なっていない**ため面食らう、という声があり、間に WelcomeGate を挟んだ。
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <WelcomeGate />;
  }

  const projects = await listProjectSummaries(supabase);

  return (
    /* 【段を3つに分ける】(実機の報告 2026-08-20)。以前はヘッダーも作る
       ボタンもカードも 56〜73px の帯で、どれが主役か読めなかった。

       この画面で毎日やるのは【開く】で、【作る】はたまに。だから
       いちばん大きい塊は一覧のカードにする。名乗り(ヘッダー)はいちばん
       軽く、作る入口はその中間。間隔も、名乗り → 本題 は広く、
       本題の中は狭く取る */
    <div className="flex flex-1 flex-col px-gutter pb-gutter-lg">
      <div className="mx-auto flex w-full max-w-md flex-col md:max-w-3xl">
        <AppHeader>
          <div className="flex items-center gap-unit">
            <ThemeButton />
            <SettingsButton />
          </div>
        </AppHeader>

        <div className="mt-gutter-lg flex flex-col gap-gutter">
          <NewProjectButton userId={user.id} />
          <ProjectList projects={projects} />
        </div>
      </div>
    </div>
  );
}
