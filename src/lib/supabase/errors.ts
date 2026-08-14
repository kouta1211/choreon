/**
 * Supabase(PostgREST)から返ってきたエラーを、画面に出す日本語メッセージへ変換する。
 *
 * これまで各コンポーネントのcatch節は `catch { showToast("〜に失敗しました") }` と
 * エラーの中身を捨てていた。そのため「スキーマを当て忘れている」のように
 * 原因がはっきりしていて対処法もある失敗まで、原因不明の失敗と同じ文言になって
 * しまっていた。ここで代表的な原因だけは具体的な文言に振り分ける。
 */

/** PostgRESTが「そのテーブルにその列は存在しない」と判断した時に返すコード。
 * スキーマキャッシュに列が無い＝DBに supabase/schema.sql が当たっていない、
 * というのが実際上ほぼ唯一の原因になる */
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
 * DBが返す2種類の原因を、いまの言語の文にするための入れ物。
 *
 * ■ なぜ引数で渡さないのか
 * `toUserMessage` は51箇所から呼ばれていて、そのほとんどが
 * 「失敗したときの一言」を渡すだけの catch 節。辞書を全部の呼び出しへ
 * 足すと、この2文のためにファイル数十個が変わる。
 * 言語は画面全体で1つしかない値なので、**LocaleProvider が変わったときに
 * ここへ書き写す**形にした(dbErrorMessages)。既定は日本語で、
 * 書き写す前に呼ばれても文字が消えない。
 */
let dbErrorMessages = {
  missingColumn:
    "DBのスキーマが古いようです。supabase/schema.sql をSupabaseのSQL Editorで実行してください",
  insufficientPrivilege:
    "権限がありません。テーブルのGRANT・RLSポリシーを確認してください",
};

export function setDbErrorMessages(messages: typeof dbErrorMessages): void {
  dbErrorMessages = messages;
}

/**
 * @param error catch節で受け取ったerror(型はunknown)
 * @param fallback 原因を特定できなかった場合に使う、操作に応じた文言
 */
export function toUserMessage(error: unknown, fallback: string): string {
  const postgrestError = asPostgrestError(error);

  if (postgrestError?.code === MISSING_COLUMN_CODE) {
    return dbErrorMessages.missingColumn;
  }

  if (postgrestError?.code === INSUFFICIENT_PRIVILEGE_CODE) {
    return dbErrorMessages.insufficientPrivilege;
  }

  return fallback;
}
