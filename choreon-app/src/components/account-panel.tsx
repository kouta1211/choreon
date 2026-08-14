import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/features/auth/api/auth';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import {
  listMyProjects,
  loadProject,
  type ProjectListItem,
} from '@/features/project/api/load';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';

type Props = {
  /** 作品を読み込んだあとに呼ぶ。仮のサンプルから本物へ切り替わったことを画面へ伝える */
  onProjectLoaded: (stage: { width: number; height: number }) => void;
};

/**
 * ログインして、自分の作品を **開く（読むだけ）**。
 *
 * ■ 書き込みはまだ通していない
 * ここで開いた作品を動かしても、Supabase へは1文字も書かない。ネイティブ版は
 * まだ実機で1周も確認できていないので、確認できていないコードに本物の作品を
 * 書き換えさせない。**画面にもそう書いてある**（黙って保存されないのが
 * いちばん困る）。
 *
 * ■ 登録もここから出せるようにした
 * 確認用のアカウントを作れないと、本物の作品を触るしか試しようが無くなる。
 * メール確認が要る設定なら、その旨を出して止まる（Web版 AuthForm と同じ）。
 */
export function AccountPanel({ onProjectLoaded }: Props) {
  const email = useSessionStore((state) => state.email);
  const isLoaded = useSessionStore((state) => state.isLoaded);
  const start = useSessionStore((state) => state.start);

  useEffect(() => start(), [start]);

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        アカウント{isLoaded ? '' : '（確かめています）'}
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
        setError('メールアドレスまたはパスワードが正しくありません');
      }
      setIsBusy(false);
      return;
    }

    const { data, error: signUpError } = await signUpWithPassword(email, password);
    if (signUpError) {
      setError(
        signUpError.message === 'User already registered'
          ? 'このメールアドレスはすでに登録されています'
          : '登録できませんでした',
      );
      setIsBusy(false);
      return;
    }
    // メール確認を切ってある設定なら、この時点でログイン済みになる
    if (!data.session) {
      setNotice('確認のメールを送りました。メールのリンクを開いてから、ログインしてください');
    }
    setIsBusy(false);
  };

  return (
    <View className="gap-3">
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="メールアドレス"
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
        placeholder="パスワード"
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
          accessibilityLabel="ログイン"
          className={`flex-1 items-center rounded-xl bg-accent py-3 active:opacity-80 ${
            isBusy || email === '' || password === '' ? 'opacity-40' : ''
          }`}
        >
          <Text className="text-base font-semibold text-accent-fg">ログイン</Text>
        </Pressable>
        <Pressable
          onPress={() => void run('signup')}
          disabled={isBusy || email === '' || password === ''}
          accessibilityRole="button"
          accessibilityLabel="新規登録"
          className={`items-center rounded-xl border border-line-strong px-4 py-3 active:opacity-80 ${
            isBusy || email === '' || password === '' ? 'opacity-40' : ''
          }`}
        >
          <Text className="text-base text-fg">新規登録</Text>
        </Pressable>
      </View>

      {error ? <Text className="text-sm text-[#f87171]">{error}</Text> : null}
      {notice ? <Text className="text-sm text-accent-soft">{notice}</Text> : null}

      <Text className="text-xs leading-5 text-fg-muted">
        Web版と同じアカウントです。ここで開いた作品は<Text className="text-fg-sub">読むだけ</Text>
        で、この端末で動かしても保存はされません。
      </Text>
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
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openedTitle, setOpenedTitle] = useState<string | null>(null);
  const hydrate = useProjectStore((state) => state.hydrate);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const list = await listMyProjects();
        if (alive) setProjects(list);
      } catch {
        if (alive) setError('作品の一覧を読めませんでした（通信か権限の問題です）');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const open = async (item: ProjectListItem) => {
    setError(null);
    setOpeningId(item.id);
    try {
      const loaded = await loadProject(item.id);
      if (!loaded) {
        setError('その作品は見つかりませんでした');
        return;
      }
      hydrate({ ...loaded, isGuest: false });
      // 時刻の順で最初のシーンを選ぶ（Web版 useHydrateProject と同じ規則）
      const first = [...loaded.scenes].sort(
        (a, b) => a.timeSeconds - b.timeSeconds || a.orderIndex - b.orderIndex,
      )[0];
      useUIStore.getState().selectScene(first?.id ?? null);
      useUIStore.getState().selectDancer(null);
      setOpenedTitle(loaded.project.title);
      onProjectLoaded({
        width: loaded.project.stageWidth,
        height: loaded.project.stageHeight,
      });
    } catch {
      setError('作品を読めませんでした');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-fg-strong" numberOfLines={1}>
          {email}
        </Text>
        <Pressable
          onPress={() => void signOut()}
          accessibilityRole="button"
          accessibilityLabel="ログアウト"
          className="rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-sm text-fg">ログアウト</Text>
        </Pressable>
      </View>

      {openedTitle ? (
        <Text className="text-xs text-accent-soft">
          「{openedTitle}」を開いています（この端末での変更は保存されません）
        </Text>
      ) : null}

      {projects === null ? (
        <ActivityIndicator />
      ) : projects.length === 0 ? (
        <Text className="text-sm text-fg-muted">まだ作品がありません</Text>
      ) : (
        <View className="gap-2">
          {projects.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void open(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              className="flex-row items-center justify-between rounded-xl bg-surface-raised px-4 py-3 active:opacity-80"
            >
              <Text className="flex-1 text-base text-fg" numberOfLines={1}>
                {item.title}
              </Text>
              {openingId === item.id ? (
                <ActivityIndicator />
              ) : (
                <Text className="text-xs text-fg-muted">開く</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text className="text-sm text-[#f87171]">{error}</Text> : null}
    </View>
  );
}
