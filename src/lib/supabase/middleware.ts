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

  // createServerClientとgetUser()の間に処理を挟まない(Supabase公式の注意事項。
  // 挟むとセッションのランダムなログアウトが起きうる)。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith(OWNER_ONLY_PREFIX)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
