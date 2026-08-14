import { supabase } from '@/lib/supabase/client';

/**
 * ログイン・登録・ログアウト。
 *
 * Web版（src/features/auth/api/auth.ts）は呼ぶたびに `createClient()` して
 * いるが、あちらは Cookie を読み直す必要があるため。ネイティブは端末に1つの
 * クライアントを持ち続ける（`lib/supabase/client.ts`）ので、それを使う。
 *
 * セッションは storage（AsyncStorage / localStorage）へ書かれるので、
 * アプリを終了して開き直してもログインしたまま。
 */
export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}
