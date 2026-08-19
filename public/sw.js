/**
 * Choreon のサービスワーカー。
 *
 * ■ 何のために置くか
 * 稽古場は電波が悪い。開いたことのある画面くらいは、圏外でも出てほしい。
 *
 * ■ 何を、どう持つか
 * - 画面(HTML)は【network-first】。先にネットへ行き、だめなら控えを出す。
 *   逆(cache-first)にすると、新しく出したはずの版がいつまでも出ない。
 * - Next.js の静的ファイル(_next/static 以下)は【cache-first】。
 *   中身が変わればURLも変わる(ハッシュ付き)ので、
 *   古いものを掴み続ける心配が無い。
 * - Supabase への通信と /api 以下は【触らない】。作品のデータを勝手に
 *   控えると、古い隊形を「いまの隊形」として見せてしまう。振付は
 *   直したそばから共有される種類のもので、そこを間違えると実害が出る。
 *
 * ■ 曲は別の場所に控えてある
 * 音源は IndexedDB(Dexie / musicStorage.ts)に置いてあり、ここでは扱わない。
 * サービスワーカーの控えは「アプリの殻」だけ。
 */

// 版を上げると、古い控えは activate で捨てられる
// v2: 控えてよい画面を許可リストへ変えた(2026-08-19)。v1 が控えた
//     ログイン後のトップページを、入れ替えのときに捨てるため
const VERSION = "v2";
const SHELL = `choreon-shell-${VERSION}`;
const PAGES = `choreon-pages-${VERSION}`;

/** 圏外で、控えも無い画面を開いたときに出すもの */
const OFFLINE_URL = "/offline";

/**
 * その画面を控えてよいか。**許可したものだけ**を控える。
 *
 * ■ 控えてよいのは2つだけ
 *  - `/view/...` … 閲覧専用のビューア。見るだけの画面で、稽古場で電波が
 *    切れたときにこそ要る。ここが控えの本命
 *  - `/offline` … 圏外のときに出す画面そのもの
 *
 * ■ ログインした人の画面を控えない
 * 理由は2つある。
 *  1. 圏外で出しても【嘘になる】。中身はサーバーで取ってから描いていて、
 *     控えから出せば古い隊形・古い一覧が出る。しかも編集できるように
 *     見えるのに、保存は全部失敗する。
 *  2. 端末を共有している場合、ログアウトした後でも控えが残る。
 *
 * ■ なぜ「除いたもの以外は控える」をやめたか(2026-08-19)
 * 以前は `/projects/` で始まるものだけを除いていたが、**トップページ `/` は
 * ログインしていると作品の一覧を描く**サーバーページで、そこから漏れていた。
 * 除く側を数え上げる書き方だと、画面が増えるたびに漏れる。控えて嬉しい画面は
 * ずっと少ないので、そちら側を数える。
 *
 * 圏外で `/` を開いた人は `/offline` へ落ち、そこから「最後に見た振付」へ
 * 戻れる(LastViewedLink)。ホーム画面のアイコンが開くのは `/` なので、
 * この道が実際の戻り道になる。
 */
function isCacheablePage(url) {
  return url.pathname === OFFLINE_URL || url.pathname.startsWith("/view/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // 失敗しても入れ替えは進める(圏外でインストールされることもある)
      await cache.addAll([OFFLINE_URL]).catch(() => {});
      // 待たずに新しい版へ入れ替える。古い殻を抱えたまま新しいAPIを
      // 呼ぶ状態を作らないため
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("choreon-") && !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // 自分の出しているものだけ。Supabase(別ドメイン)には触らない
  if (url.origin !== self.location.origin) return;
  // サーバーで作るもの(診断・認証の往復)は素通し
  if (url.pathname.startsWith("/api/")) return;

  // ハッシュ付きの静的ファイル。URLが変われば中身も変わるので、
  // 一度取ったら使い回してよい
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL);
          void cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // 画面。先にネットへ行き、取れたぶんだけ控えを新しくする
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && isCacheablePage(url)) {
            const cache = await caches.open(PAGES);
            void cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;

          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;

          return new Response("オフラインです", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
  }
});
