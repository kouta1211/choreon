import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ProjectPanel } from '@/components/project-panel';

import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/features/auth/api/auth';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  /** 作品を読み込んだあとに呼ぶ。仮のサンプルから本物へ切り替わったことを画面へ伝える */
  onProjectLoaded: (stage: { width: number; height: number }) => void;
};

/**
 * ログインして、自分の作品を開く。
 *
 * ■ 開いた作品は【保存される】
 * 立ち位置・シーン・ダンサーの変更は Supabase へ書く（各画面が persist を
 * 通す）。**実機での確認はこれから**なので、画面にも「まずは捨ててよい
 * 作品で」と出している。保存に失敗したら見た目を元へ戻して知らせるので、
 * 黙って消えることはない。
 *
 * ■ 登録もここから出せるようにした
 * 確認用のアカウントを作れないと、本物の作品を触るしか試しようが無くなる。
 * メール確認が要る設定なら、その旨を出して止まる（Web版 AuthForm と同じ）。
 */
export function AccountPanel({ onProjectLoaded }: Props) {
  const t = useT();
  const email = useSessionStore((state) => state.email);
  const isLoaded = useSessionStore((state) => state.isLoaded);
  const start = useSessionStore((state) => state.start);

  useEffect(() => start(), [start]);

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.account.section}
        {isLoaded ? '' : t.account.checking}
      </Text>

      {email ? (
        <SignedIn email={email} onProjectLoaded={onProjectLoaded} />
      ) : (
        <SignInForm />
      )}
    </View>
  );
}

function SignInForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (mode: 'login' | 'signup') => {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    if (mode === 'login') {
      const { data, error: signInError } = await signInWithPassword(email, password);
      // 「どちらが違うか」は出さない（登録済みのメールを当てられるため）。
      // Web版と同じ文言
      if (signInError || !data.user) {
        setError(t.account.wrongCredentials);
      }
      setIsBusy(false);
      return;
    }

    const { data, error: signUpError } = await signUpWithPassword(email, password);
    if (signUpError) {
      setError(
        signUpError.message === 'User already registered'
          ? t.account.alreadyRegistered
          : t.account.signUpFailed,
      );
      setIsBusy(false);
      return;
    }
    // メール確認を切ってある設定なら、この時点でログイン済みになる
    if (!data.session) {
      setNotice(t.account.confirmSent);
    }
    setIsBusy(false);
  };

  return (
    <View className="gap-3">
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t.account.email}
        placeholderTextColor="#8a8a8f"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-base text-fg-strong"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t.account.password}
        placeholderTextColor="#8a8a8f"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="password"
        className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-base text-fg-strong"
      />

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => void run('login')}
          disabled={isBusy || email === '' || password === ''}
          accessibilityRole="button"
          accessibilityLabel={t.account.signIn}
          className={`flex-1 items-center rounded-xl bg-accent py-3 active:opacity-80 ${
            isBusy || email === '' || password === '' ? 'opacity-40' : ''
          }`}
        >
          <Text className="text-base font-semibold text-accent-fg">{t.account.signIn}</Text>
        </Pressable>
        <Pressable
          onPress={() => void run('signup')}
          disabled={isBusy || email === '' || password === ''}
          accessibilityRole="button"
          accessibilityLabel={t.account.signUp}
          className={`items-center rounded-xl border border-line-strong px-4 py-3 active:opacity-80 ${
            isBusy || email === '' || password === '' ? 'opacity-40' : ''
          }`}
        >
          <Text className="text-base text-fg">{t.account.signUp}</Text>
        </Pressable>
      </View>

      {error ? <Text className="text-sm text-[#f87171]">{error}</Text> : null}
      {notice ? <Text className="text-sm text-accent-soft">{notice}</Text> : null}

      <Text className="text-xs leading-5 text-fg-muted">{t.account.note}</Text>
    </View>
  );
}

function SignedIn({
  email,
  onProjectLoaded,
}: {
  email: string;
  onProjectLoaded: (stage: { width: number; height: number }) => void;
}) {
  const t = useT();
  const userId = useSessionStore((state) => state.userId);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-fg-strong" numberOfLines={1}>
          {email}
        </Text>
        <Pressable
          onPress={() => void signOut()}
          accessibilityRole="button"
          accessibilityLabel={t.account.signOut}
          className="rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-sm text-fg">{t.account.signOut}</Text>
        </Pressable>
      </View>

      {/* 作品の出し入れは別の部品。ここはログインの状態だけを持つ */}
      {userId ? (
        <ProjectPanel userId={userId} onProjectLoaded={onProjectLoaded} />
      ) : null}

      <Text className="text-xs leading-5 text-fg-muted">{t.account.note}</Text>
    </View>
  );
}
