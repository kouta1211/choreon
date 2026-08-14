import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { supabase } from '@/lib/supabase/client';

/**
 * 「保存できるなら保存する」ための唯一の窓口。
 *
 * ネイティブ版でも、未ログイン（ゲスト）や仮のサンプルを触っている間は
 * Supabase へ書かない。判定を各操作（ドラッグ・シーン追加・改名…）に
 * 書いて回ると、必ずどこかで書き忘れて「ゲストなのに401」「保存したつもりが
 * 消える」が起きる。**書き込みは全てここを通す**（Web版 persistence.ts と
 * 同じ考え方）。
 *
 * ■ Web版との違い
 * - クライアントは端末に1つ（`createClient()` を毎回呼ばない）
 * - 自動保存を切る設定と、貯めた書き込みの再送はまだ持っていない。
 *   ネイティブ版の設定画面がまだ無いので、切る手段が無い
 *
 * @returns ゲスト中は null（何も保存していない）。それ以外は run の戻り値
 */
export async function persist<T>(
  run: (client: SupabaseClient<Database>) => Promise<T>,
): Promise<T | null> {
  const { isGuest, markUnsaved } = useProjectStore.getState();

  if (isGuest) {
    // 「本来なら保存していた変更」がここを通る。この1行だけで
    // 「未保存の変更があるか」を正確に拾える
    markUnsaved();
    return null;
  }

  return run(supabase as SupabaseClient<Database>);
}
