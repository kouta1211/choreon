import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * サービスワーカー(`public/sw.js`)が、**どの画面を控えてよいと思っているか**。
 *
 * ■ なぜ隣に置けないか
 * `public/` の中身はそのまま配信される。ここへテストを置くと、テストの
 * ファイルまで公開されてしまう。だから `src/test/` から、ファイルを読んで
 * 判定の関数だけを取り出して試す。
 *
 * ■ なぜ試すのか
 * ここが緩むと**ログインした人の画面が端末に残る**。共有している端末なら、
 * ログアウトした後でも前の人の作品名が圏外で出る。目で見て気づける類の
 * 壊れ方ではないので、機械に見張らせる（2026-08-19）。
 */
function loadIsCacheablePage(): (url: URL) => boolean {
  const source = readFileSync(
    path.resolve(__dirname, "../../public/sw.js"),
    "utf8",
  );
  const offlineUrl = /const OFFLINE_URL = "[^"]+";/.exec(source);
  const decide = /function isCacheablePage\(url\) \{[\s\S]*?\n\}/.exec(source);
  if (!offlineUrl || !decide) {
    throw new Error("sw.js の isCacheablePage を見つけられませんでした");
  }
  return new Function(
    `${offlineUrl[0]}\n${decide[0]}\nreturn isCacheablePage;`,
  )() as (url: URL) => boolean;
}

const isCacheablePage = loadIsCacheablePage();
const at = (pathname: string) => new URL(pathname, "https://choreon.app");

describe("sw.js が控えてよい画面", () => {
  it("閲覧専用のビューアは控える(稽古場で電波が切れても見られる)", () => {
    expect(isCacheablePage(at("/view/abc"))).toBe(true);
    expect(isCacheablePage(at("/view/abc?t=token"))).toBe(true);
  });

  it("圏外の画面そのものは控える", () => {
    expect(isCacheablePage(at("/offline"))).toBe(true);
  });

  /* ここが本題。ログインしていると作品の一覧を描くので、
     控えると共有端末でログアウト後にも残る */
  it("トップページは控えない", () => {
    expect(isCacheablePage(at("/"))).toBe(false);
  });

  it("エディタは控えない(古い隊形を「いまの隊形」として見せない)", () => {
    expect(isCacheablePage(at("/projects/abc"))).toBe(false);
  });

  it("ログイン・登録の画面も控えない", () => {
    expect(isCacheablePage(at("/login"))).toBe(false);
    expect(isCacheablePage(at("/signup"))).toBe(false);
  });

  /* 画面が増えたとき、既定で控えられてしまわないこと */
  it("知らない画面は控えない(除く側ではなく、許す側を数えている)", () => {
    expect(isCacheablePage(at("/whatever-comes-next"))).toBe(false);
  });
});
