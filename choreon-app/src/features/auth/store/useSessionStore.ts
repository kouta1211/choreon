import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

type SessionStore = {
  /** ログインしている人のメールアドレス。未ログインなら null */
  email: string | null;
  userId: string | null;
  /** 端末に残っているセッションを確かめ終えたか */
  isLoaded: boolean;

  /** 起動時に1回だけ呼ぶ。以後は Supabase 側の通知で勝手に更新される */
  start: () => () => void;
};

/**
 * いまログインしているか。
 *
 * ■ 自分で状態を持たず、Supabase の通知を写すだけ
 * セッションの持ち主は supabase-js（更新も期限切れもあちらが面倒を見る）。
 * ここで別に持つと、トークンが切れたのに画面はログイン中のまま、という
 * ずれ方をする。`onAuthStateChange` を購読して**写すだけ**にしてある。
 *
 * ■ isLoaded を持つ理由
 * 端末に残っているセッションを読むのは非同期。読み終える前に「ログイン
 * してください」と出すと、実際にはログインしている人にも一瞬そう見える。
 */
export const useSessionStore = create<SessionStore>((set) => ({
  email: null,
  userId: null,
  isLoaded: false,

  start: () => {
    void supabase.auth.getSession().then(({ data }) => {
      set({
        email: data.session?.user.email ?? null,
        userId: data.session?.user.id ?? null,
        isLoaded: true,
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
        isLoaded: true,
      });
    });
    return () => data.subscription.unsubscribe();
  },
}));
