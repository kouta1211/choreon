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
  /* **`getUser()` ではなく `getClaims()`**。理由（Auth サーバーへの往復を
     やめる／それでも署名は検証している）は `lib/supabase/middleware.ts`
     に書いてある。ここはログイン直後に着く画面なので、proxy と合わせて
     往復を2回払っていた */
  const { data } = await supabase.auth.getClaims();

  if (!data) {
    return <WelcomeGate />;
  }
  const userId = data.claims.sub;

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
          <NewProjectButton userId={userId} />
          <ProjectList projects={projects} />
        </div>
      </div>
    </div>
  );
}
