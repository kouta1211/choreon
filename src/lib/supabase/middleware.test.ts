import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * proxy の振り分けのテスト。
 *
 * ■ なぜここに網を張るのか
 * `updateSession` は **すべてのリクエストが必ず通る**。ここが間違うと、
 * ログインしている人が締め出されるか、していない人が編集画面へ入る。
 * どちらも画面を見て気づくのが遅い（自分はログインしているので、
 * 締め出しの側は再現しない）。
 *
 * ■ 何を縛っているか
 * **「どう確かめたか」ではなく「どこへ送るか」**だけを見る。
 * 認証の確かめ方は速さのために取り替えうる（2026-08-31 に
 * `getUser()` → `getClaims()` へ替えた）。そのとき網ごと落ちては
 * 意味が無いので、下のモックは **getUser と getClaims の両方**に
 * 同じ「ログインしているか」を答えさせている。
 */
const authState = { signedIn: false };

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({
        data: { user: authState.signedIn ? { id: "user-1" } : null },
        error: null,
      }),
      getClaims: async () => ({
        data: authState.signedIn
          ? { claims: { sub: "user-1" }, header: {}, signature: new Uint8Array() }
          : null,
        error: null,
      }),
    },
  }),
}));

const { updateSession } = await import("./middleware");

const visit = (path: string) =>
  updateSession(new NextRequest(new URL(`https://choreon.test${path}`)));

/** リダイレクトなら行き先の pathname、素通りなら null */
const redirectTo = (response: Response) => {
  const location = response.headers.get("location");
  return location === null ? null : new URL(location).pathname;
};

beforeEach(() => {
  authState.signedIn = false;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("updateSession の振り分け", () => {
  it("未ログインで作品を直に開いたら、トップへ戻す", async () => {
    expect(redirectTo(await visit("/projects/abc"))).toBe("/");
  });

  it("未ログインでもトップは素通り（ゲストで編集できる）", async () => {
    expect(redirectTo(await visit("/"))).toBeNull();
  });

  it("未ログインならログイン画面は素通り", async () => {
    expect(redirectTo(await visit("/login"))).toBeNull();
  });

  it("ログイン済みなら作品を開ける", async () => {
    authState.signedIn = true;
    expect(redirectTo(await visit("/projects/abc"))).toBeNull();
  });

  it("ログイン済みでログイン画面を開いたら、トップへ戻す", async () => {
    authState.signedIn = true;
    expect(redirectTo(await visit("/login"))).toBe("/");
  });

  it("ログイン済みで新規登録を開いたら、トップへ戻す", async () => {
    authState.signedIn = true;
    expect(redirectTo(await visit("/signup"))).toBe("/");
  });
});
