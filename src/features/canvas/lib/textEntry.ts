/**
 * いま文字を打っている最中か。**ショートカットを差し止めるための判定。**
 *
 * ■ なぜ1箇所にまとめたか(2026-08-21)
 * まったく同じ関数が `EditorShortcuts` と `HistoryControls` に**2つ**あった。
 * ここは「作品名を打っている最中に Delete でダンサーが消える」のような、
 * **取り返しのつかない誤爆**を止めている場所。片方だけ直したときに、
 * もう片方が黙って古いままになるのがいちばん困る。
 *
 * ■ 拾うもの
 * `<input>` `<textarea>` `<select>` と、`contenteditable` の中。
 * 作品名やシーン名の欄はどれもこのどれかに当たる。
 */
export function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  /* `isContentEditable` はブラウザでは boolean だが、**jsdom は実装して
     いない**（undefined が返る）。以前はこれをそのまま返していたので、
     戻り値の型が boolean なのに undefined を返すことがあった —
     テストを書いて初めて分かった。属性でも見て、必ず boolean を返す */
  if (target.isContentEditable) return true;
  return target.getAttribute("contenteditable") === "true";
}
