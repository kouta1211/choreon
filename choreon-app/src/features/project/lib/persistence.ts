import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
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
 * ■ Web版との違いは1つだけ
 * クライアントは端末に1つ（`createClient()` を毎回呼ばない）。
 * 自動保存を切る仕組みは、Web版と同じものをここへ持ってきた。
 *
 * @returns ゲスト中・貯めた場合は null（まだ何も送っていない）
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

  // 自動保存を切っている間は、実行せず順番に貯める。呼び出し側は既に
  // 画面を書き換えている（楽観的更新）ので、見えているものは貯めた内容と一致する
  if (!useSettingsStore.getState().isAutoSaveEnabled) {
    pendingWrites.push(run as PendingWrite);
    markUnsaved();
    return null;
  }

  return run(supabase as SupabaseClient<Database>);
}

type PendingWrite = (client: SupabaseClient<Database>) => Promise<unknown>;

/**
 * 自動保存を切っている間に貯まった書き込み。
 *
 * **順番を保つ**ために配列で持つ。シーンを作ってから、そのシーンへ
 * 立ち位置を入れる、のような依存があるので、まとめて並列に投げられない。
 *
 * モジュールの変数に置いているのは、これがストアの状態ではなく
 * 「まだ実行していない副作用」だから。画面の描画には一切関わらない
 * （未保存の印だけは `useProjectStore` が持つ）。
 */
const pendingWrites: PendingWrite[] = [];

/** まだ実行していない書き込みの数 */
export function pendingWriteCount(): number {
  return pendingWrites.length;
}

/**
 * 貯めた書き込みを捨てる。**別の作品を開くときに呼ぶ。**
 *
 * 貯めているのは「どの作品のものか」を持たない関数なので、持ち越すと
 * 次に開いた作品を保存したときに、前の作品への書き込みまで一緒に走る。
 */
export function discardPendingWrites(): void {
  pendingWrites.length = 0;
}

/**
 * 貯めた書き込みを、貯めた順に実行する。
 *
 * 途中で失敗したら、失敗したものと、それ以降を**残したまま**投げ返す。
 * 消してしまうと「保存したはずの変更が次に開いたとき無い」になる。
 * 残っていれば、もう一度押すか、自動保存へ戻した時点でやり直せる。
 */
export async function flushPendingWrites(): Promise<void> {
  // ゲストの下書きはそもそもここへ来ない（クラウドに置き場所が無い）。
  // markSaved は「クラウドへ入った」を意味し isGuest を降ろすので、
  // 取り違えると下書きが保存済み扱いになる
  if (useProjectStore.getState().isGuest) return;

  const client = supabase as SupabaseClient<Database>;
  while (pendingWrites.length > 0) {
    await pendingWrites[0](client);
    pendingWrites.shift();
  }
  useProjectStore.getState().markSaved();
}
