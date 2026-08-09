import { THEME_STORAGE_KEY } from "@/features/theme/lib/themePreference";
import { DEFAULT_THEME, DEFAULT_TEXTURE } from "@/features/theme/catalog";

/**
 * <head>で同期的に走らせる、ちらつき防止のスクリプト。
 *
 * 見た目は端末(localStorage)に持っているので、サーバーは何を出せばよいか
 * 知らない。Reactのマウント後に当てると、紙のテーマを選んでいる人には
 * 「一瞬まっ暗な画面 → 紙」が毎回見える。描画前に属性だけ先に書いておけば
 * それが起きない。
 *
 * ここだけは文字列で持つ必要がある(バンドルされた関数はReactの
 * ハイドレーション後にしか動かないため)。中身は最小限にとどめ、
 * 判定の本体は themePreference.ts 側に置いてテストしている。
 * このスクリプトが失敗しても、あとからストアが同じ値を当て直す。
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var pref = raw ? JSON.parse(raw) : {};
    var match = location.pathname.match(/^\\/projects\\/([^/?#]+)/);
    var override = match && pref.byProject ? pref.byProject[decodeURIComponent(match[1])] : null;
    var chosen = override || pref;
    var root = document.documentElement;
    root.dataset.theme = chosen.theme || ${JSON.stringify(DEFAULT_THEME)};
    root.dataset.texture = chosen.texture || ${JSON.stringify(DEFAULT_TEXTURE)};
  } catch (e) {
    // 読めなければ既定のまま。CSSの :root がそれにあたる
  }
})();
`;
