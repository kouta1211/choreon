import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

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

  // 自動保存を切っている間は、書き込みを実行せず順番に貯める。
  // 呼び出し側は既に画面を書き換えている(楽観的更新)ので、
  // 見えているものは貯めた内容と一致している
  if (!useSettingsStore.getState().isAutoSaveEnabled) {
    pendingWrites.push(run as PendingWrite);
    markUnsaved();
    return null;
  }

  return run(createClient());
}

type PendingWrite = (supabase: SupabaseClient<Database>) => Promise<unknown>;

/**
 * 自動保存を切っている間に貯まった書き込み。
 *
 * 【順番を保つ】ために配列で持つ。シーンを作ってから、そのシーンへ
 * 立ち位置を入れる、のような依存があるので、まとめて並列に投げられない。
 *
 * モジュールの変数に置いているのは、これがストアの状態ではなく
 * 「まだ実行していない副作用」だから。画面の描画には一切関わらない
 * (件数だけは知らせたいので、未保存の印は useProjectStore が持つ)。
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
 * 捨てた側の変更は失われるが、そちらは画面を離れる前に
 * (UnsavedChangesGuard が)引き止めている。
 */
export function discardPendingWrites(): void {
  pendingWrites.length = 0;
}

/**
 * 貯めた書き込みを、貯めた順に実行する。
 *
 * 途中で失敗したら、失敗したものと、それ以降を残したまま投げ返す。
 * 消してしまうと「保存したはずの変更が次に開いたとき無い」になる。
 * 残っていれば、もう一度押すか、自動保存へ戻した時点でやり直せる。
 */
export async function flushPendingWrites(): Promise<void> {
  // ゲストの下書きはそもそもここへ来ない(クラウドに置き場所が無い)。
  // markSaved は「クラウドへ入った」を意味しisGuestを降ろすので、
  // 取り違えると下書きが保存済み扱いになる
  if (useProjectStore.getState().isGuest) return;

  const supabase = createClient();
  while (pendingWrites.length > 0) {
    await pendingWrites[0](supabase);
    pendingWrites.shift();
  }
  useProjectStore.getState().markSaved();
}
