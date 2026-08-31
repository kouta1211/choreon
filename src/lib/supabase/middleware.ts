import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** ログイン済みの人が開いても意味の無い画面。開いたら本編へ送り返す */
const AUTH_PATHS = ["/login", "/signup"];

/** 未ログインでは中身が空になる画面。
 *
 * トップページ(/)はゲストモードのエディタとして未ログインでも開けるように
 * したので、ここには含めない。保存しようとしたときだけ登録の壁が出る。
 * 一方 /projects/xxx はRLSで行が返らず「見つかりません」になるだけなので、
 * ログインへ促すためにトップへ戻している */
const OWNER_ONLY_PREFIX = "/projects";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /* createServerClientと認証の確認の間に処理を挟まない(Supabase公式の
     注意事項。挟むとセッションのランダムなログアウトが起きうる)。

     ■ getUser() ではなく getClaims() を呼ぶ(2026-08-31)
     `getUser()` は **毎回 Auth サーバーへ問い合わせる**。この proxy は
     画像と `_next/static` 以外のすべてのリクエストが通るので、
     ログインしている人はページを開くたびに、描画が始まる前に
     往復1回ぶん待たされていた(実機の報告:「ログインや新規作成の
     ロードが長い」)。

     `getClaims()` は、プロジェクトが**非対称の署名鍵**を使っていれば
     WebCrypto で**その場で**検証する(通信しない)。このプロジェクトの
     鍵は ES256 で、確認済み:
       curl https://<project>.supabase.co/auth/v1/.well-known/jwks.json

     ⚠️ **`getSession()` に替えてはいけない。** あちらは署名を検証せず、
     cookie の中身を信じるだけ。`getClaims()` は検証する。
     期限が近ければセッションを更新するので、cookie を配り直す役目も
     そのまま果たす。 */
  const { data: claims } = await supabase.auth.getClaims();
  const isSignedIn = claims !== null;

  const { pathname } = request.nextUrl;

  if (!isSignedIn && pathname.startsWith(OWNER_ONLY_PREFIX)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isSignedIn && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
