import { loadDefaultJapaneseParser } from "budoux";

/**
 * 日本語の文を、**文節**に切る。
 *
 * ■ なぜ要るのか（実機の報告 2026-08-19）
 * 日本語には単語の区切りが無いので、ブラウザは既定でどこでも折る
 * （「速す／ぎます」）。CSS の `word-break: auto-phrase` が同じことを
 * してくれるが、**Chrome / Edge にしか入っていない** — 閲覧の主戦場である
 * iPhone（iOS Safari）と Firefox には効かない。
 * そこで、切れてよい場所を `<wbr>` として文の中へ入れる。
 *
 * ■ 切るのは日本語だけ
 * 英語と韓国語は空白で切れるので、ブラウザに任せた方が良い結果になる。
 *
 * ■ 解析器は1つだけ作る
 * 読み込みに辞書が付いてくるので、呼ぶたびに作ると重い。
 */

/** 解析器は使うときに1度だけ作る（読み込み時に作ると、使わない画面でも重い） */
let parser: ReturnType<typeof loadDefaultJapaneseParser> | null = null;

function japaneseParser() {
  parser ??= loadDefaultJapaneseParser();
  return parser;
}

/**
 * 文を文節へ切る。切れ目が無い（切る意味が無い）ときは、元の文1つだけを返す。
 *
 * 呼ぶ側は、返ってきた要素のあいだに `<wbr>` を置く。
 */
export function toPhrases(text: string): string[] {
  if (text === "") return [];
  return japaneseParser().parse(text);
}
