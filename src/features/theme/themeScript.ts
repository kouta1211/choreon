import { THEME_STORAGE_KEY } from "@/features/theme/lib/themePreference";
import { DEFAULT_THEME, DEFAULT_TEXTURE } from "@/features/theme/catalog";

/** 起動画面をこのタブで見たかどうかの印。タブを閉じると消える */
export const SPLASH_SEEN_KEY = "choreon.splash.seen";

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
 *
 * ■ 起動画面を出すかどうかも、ここで決める(2026-08-17)
 * 「タブを開くたび1回」のつもりが、**リロードのたびに毎回**流れていた
 * (RootLayout はアプリ内の移動では作り直されないが、リロードは作り直す)。
 * 印は sessionStorage — タブを閉じるまでは残り、新しいタブでは消える。
 * ここで先に属性を書いておかないと、React が動き出すまでのあいだ
 * 起動画面が一瞬見えてしまうので、テーマと同じ場所で面倒を見る。
 */
export const THEME_INIT_SCRIPT = `
(function () {
  var root = document.documentElement;
  try {
    var raw = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var pref = raw ? JSON.parse(raw) : {};
    var match = location.pathname.match(/^\\/projects\\/([^/?#]+)/);
    var override = match && pref.byProject ? pref.byProject[decodeURIComponent(match[1])] : null;
    var chosen = override || pref;
    root.dataset.theme = chosen.theme || ${JSON.stringify(DEFAULT_THEME)};
    root.dataset.texture = chosen.texture || ${JSON.stringify(DEFAULT_TEXTURE)};
  } catch (e) {
    // 読めなければ既定のまま。CSSの :root がそれにあたる
  }
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})) {
      root.dataset.splash = "seen";
    } else {
      sessionStorage.setItem(${JSON.stringify(SPLASH_SEEN_KEY)}, "1");
    }
  } catch (e) {
    // 覚えられない環境。毎回出るが、アプリは動く
  }
})();
`;
