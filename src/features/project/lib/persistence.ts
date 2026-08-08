import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore } from "@/features/project/store/useProjectStore";

/**
 * 「保存できるなら保存する」ための唯一の窓口。
 *
 * このアプリは未ログインでもフォーメーションを作れる(ゲストモード)。
 * その間の編集はZustandの中だけに置き、Supabaseへは書き込まない。
 *
 * 判定を各操作(ドラッグ・シーン追加・改名…)に書いて回ると、必ずどこかで
 * 書き忘れて「ゲストなのに401が出る」「保存したつもりが消える」が起きる。
 * そこで **書き込みは全てこの関数を通す** ことにして、判定を1箇所に閉じた。
 *
 * 呼び出し側は今までどおり「楽観的更新 → ここで保存 → 失敗したらロール
 * バック」の形のままでよい。ゲスト中はこの関数が何もせずに返るので、
 * 楽観的更新がそのまま最終状態になる。
 *
 * @returns ゲスト中はnull(何も保存していない)。それ以外はrunの戻り値
 */
export async function persist<T>(
  run: (supabase: SupabaseClient<Database>) => Promise<T>,
): Promise<T | null> {
  const { isGuest, markUnsaved } = useProjectStore.getState();

  if (isGuest) {
    // 「本来なら保存していた変更」がここを通る。つまりこの1行だけで
    // 「未保存の変更があるか」を正確に拾える(操作ごとにフラグを立てて
    // 回らずに済む)
    markUnsaved();
    return null;
  }

  return run(createClient());
}
