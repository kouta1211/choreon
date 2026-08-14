import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { AccountPanel } from '@/components/account-panel';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import { getT, useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定の「アカウント」。ログインと、作品を開くところ。
 *
 * 中身は既にある AccountPanel。**シートの中へ移しただけ**で、
 * ログイン・一覧・開く・ログアウトの動きは何も変えていない。
 *
 * ■ 「届いた／届かない」もここへ移した
 * 土台が生きているかを見る盤（Supabase へ届くか・どの環境で動いているか）は、
 * 前はエディタの一番下に置いていた。作品を触っている最中には要らないもので、
 * **ログインが通らないときにだけ見たい**ので、アカウントの隣が居場所になる。
 *
 * @param onProjectLoaded 作品を開いたときに、その広さを画面へ返す
 *   （ステージの形が作品ごとに違うため）
 */
export function SettingsAccountSection({
  onProjectLoaded,
}: {
  onProjectLoaded: (stage: { width: number; height: number }) => void;
}) {
  const t = useT();
  const platform = Platform.OS === 'web' ? 'Web (react-native-web)' : Platform.OS;

  // ログインしているかは【ストアから】読む — ここで getSession() を1回
  // だけ呼ぶと、あとでログインしても表示が「未ログイン」のまま古くなる
  const signedInEmail = useSessionStore((state) => state.email);

  const [reach, setReach] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`,
          { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' } },
        );
        if (alive) {
          setReach(
            response.ok ? getT().supabase.reached : getT().supabase.failed(response.status),
          );
        }
      } catch {
        if (alive) setReach(getT().supabase.offline);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View className="gap-4">
      <AccountPanel onProjectLoaded={onProjectLoaded} />

      <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
        <Text className="text-xs uppercase tracking-widest text-fg-muted">
          {t.supabase.section}
        </Text>
        <Text className="text-base text-fg-strong">
          {reach === null
            ? t.supabase.checking
            : `${reach}（${signedInEmail ? t.supabase.signedIn : t.supabase.signedOut}）`}
        </Text>
        <Text className="text-xs text-fg-muted">
          {t.supabase.platform}: {platform}
        </Text>
      </View>
    </View>
  );
}
