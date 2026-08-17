import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * AI を使う口は、ログインしている人だけ。
 *
 * ■ なぜ確かめるのか
 * 外から叩ける口をそのまま開けると、**キーの請求だけが積み上がる**。
 * 鍵はサーバーの環境変数から出さない作りだが、口が開いていれば
 * 誰でもその鍵で呼べてしまう。
 *
 * ■ Cookie で通らなかったときだけ Authorization を見る
 * ブラウザは Cookie を自動で付けてくれるが、**スマホ用アプリ
 * (choreon-app)にはその仕組みが無い** — あちらはセッションを端末の
 * ストレージに持っていて、送れるのは Bearer トークンだけ。
 * 上の道は一切変えず、通らなかった場合の受け皿だけを足してある。
 *
 * トークンの検証は Supabase にさせる(こちらで JWT を開かない)。
 * 偽のトークンなら null が返る。
 */
export async function requireViewer(request: Request): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  const bearer = request.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
  if (!token) return null;

  const { data } = await supabase.auth.getUser(token);
  return data.user;
}
