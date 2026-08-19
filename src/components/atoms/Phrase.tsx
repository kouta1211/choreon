"use client";

import { Fragment, useMemo } from "react";
import { toPhrases } from "@/features/i18n/lib/phrases";
import { useLocale } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 画面に出す文。文節の切れ目に `<wbr>` を入れて返す */
  children: string;
};

/**
 * 日本語の文を、**読める所で折れるように**して出す。
 *
 * ■ なぜ CSS だけで済まないのか（実機の報告 2026-08-19）
 * 文節で折る `word-break: auto-phrase` は **Chrome / Edge にしか入っていない**。
 * 閲覧の主戦場である iPhone（iOS Safari）と Firefox には効かないので、
 * 切れてよい場所を `<wbr>` として文の中へ入れて埋める。
 * CSS が効くブラウザでは、そちらが先に効く（`<wbr>` は邪魔をしない）。
 *
 * ■ 日本語のときだけ働く
 * 英語と韓国語は空白で切れるので、ブラウザに任せた方が良い結果になる。
 *
 * ■ 受け取るのは文字列だけ
 * 中に要素を混ぜられるようにすると、どこを切ってよいかの判断が
 * 一気に難しくなる（リンクやタグをまたいで切れる）。太字を混ぜたい文は、
 * ここを通さないか、部分ごとに包む。
 *
 * ■ 読み上げには影響しない
 * `<wbr>` は「ここで折ってよい」という印だけで、文字も空白も足さない。
 * コピーしても元の文のまま。
 */
export function Phrase({ children }: Props) {
  const locale = useLocale();
  const phrases = useMemo(
    () => (locale === "ja" ? toPhrases(children) : null),
    [locale, children],
  );

  if (!phrases) return <>{children}</>;

  return (
    <>
      {phrases.map((phrase, index) => (
        <Fragment key={`${index}-${phrase}`}>
          {phrase}
          {index < phrases.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
