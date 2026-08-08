/**
 * Supabase(PostgREST)から返ってきたエラーを、画面に出す日本語メッセージへ変換する。
 *
 * これまで各コンポーネントのcatch節は `catch { showToast("〜に失敗しました") }` と
 * エラーの中身を捨てていた。そのため「マイグレーションを当て忘れている」のように
 * 原因がはっきりしていて対処法もある失敗まで、原因不明の失敗と同じ文言になって
 * しまっていた。ここで代表的な原因だけは具体的な文言に振り分ける。
 */

/** PostgRESTが「そのテーブルにその列は存在しない」と判断した時に返すコード。
 * スキーマキャッシュに列が無い＝supabase/migrations 配下の
 * マイグレーションが未適用、というのが実際上ほぼ唯一の原因になる */
const MISSING_COLUMN_CODE = "PGRST204";

/** RLSポリシー・GRANT不足で弾かれた場合のPostgreSQLエラーコード */
const INSUFFICIENT_PRIVILEGE_CODE = "42501";

type PostgrestLikeError = {
  code?: string;
  message?: string;
};

function asPostgrestError(error: unknown): PostgrestLikeError | null {
  if (typeof error !== "object" || error === null) return null;
  return error as PostgrestLikeError;
}

/**
 * @param error catch節で受け取ったerror(型はunknown)
 * @param fallback 原因を特定できなかった場合に使う、操作に応じた文言
 */
export function toUserMessage(error: unknown, fallback: string): string {
  const postgrestError = asPostgrestError(error);

  if (postgrestError?.code === MISSING_COLUMN_CODE) {
    return "DBのマイグレーションが未適用です。supabase/migrations/ のSQLをSupabaseのSQL Editorで実行してください";
  }

  if (postgrestError?.code === INSUFFICIENT_PRIVILEGE_CODE) {
    return "権限がありません。テーブルのGRANT・RLSポリシーを確認してください";
  }

  return fallback;
}
