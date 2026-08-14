import { useSessionStore } from './useSessionStore';
import { supabase } from '@/lib/supabase/client';

/**
 * セッションのストア。**Supabase の通知を写すだけ**であることを固定する。
 * ここが自前で状態を持ち始めると、トークンが切れているのに画面だけ
 * ログイン中、というずれ方をする。
 */
jest.mock('@/lib/supabase/client', () => {
  const listeners: ((event: string, session: unknown) => void)[] = [];
  return {
    __listeners: listeners,
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null } })),
        onAuthStateChange: jest.fn((callback: (e: string, s: unknown) => void) => {
          listeners.push(callback);
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
      },
    },
  };
});

const listeners = (jest.requireMock('@/lib/supabase/client') as {
  __listeners: ((event: string, session: unknown) => void)[];
}).__listeners;

describe('useSessionStore', () => {
  beforeEach(() => {
    listeners.length = 0;
    useSessionStore.setState({ email: null, userId: null, isLoaded: false });
    jest.clearAllMocks();
  });

  it('端末に残っているセッションを読み終えるまで isLoaded は false', () => {
    expect(useSessionStore.getState().isLoaded).toBe(false);
    expect(useSessionStore.getState().email).toBeNull();
  });

  it('残っていなければ未ログインとして読み終える', async () => {
    useSessionStore.getState().start();
    await Promise.resolve();
    await Promise.resolve();

    expect(useSessionStore.getState().isLoaded).toBe(true);
    expect(useSessionStore.getState().email).toBeNull();
  });

  it('ログインの通知が来たら、そのまま写す', async () => {
    useSessionStore.getState().start();

    listeners[0]('SIGNED_IN', { user: { id: 'u1', email: 'a@example.com' } });

    expect(useSessionStore.getState().email).toBe('a@example.com');
    expect(useSessionStore.getState().userId).toBe('u1');
  });

  // 期限切れもログアウトも、届くのは「session が null」という同じ通知
  it('ログアウトの通知が来たら消える', () => {
    useSessionStore.getState().start();
    listeners[0]('SIGNED_IN', { user: { id: 'u1', email: 'a@example.com' } });

    listeners[0]('SIGNED_OUT', null);

    expect(useSessionStore.getState().email).toBeNull();
    expect(useSessionStore.getState().userId).toBeNull();
    // 読み終えてはいる（「確かめています」に戻さない）
    expect(useSessionStore.getState().isLoaded).toBe(true);
  });

  it('start が返す後始末を呼ぶと購読を解く', () => {
    const stop = useSessionStore.getState().start();
    const { subscription } = (
      supabase.auth.onAuthStateChange as jest.Mock
    ).mock.results[0].value.data;

    stop();

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});
