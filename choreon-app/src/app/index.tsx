import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase/client';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

/**
 * ネイティブ版の最初の画面。
 *
 * まだ Choreon の画面ではなく、**基盤が生きているかを目で見るための盤**。
 * 確かめているのは4つ:
 *
 *   1. NativeWind — className が Web でもネイティブでも効く
 *   2. ストレージ — 設定が端末に残る(Web は localStorage / iOS・Android は AsyncStorage)
 *   3. Supabase — 同じ鍵で本物のプロジェクトに届く
 *   4. Zustand — Web 版からコピーしたストアがそのまま動く
 *
 * 画面の移植はこの次。先に見た目だけ移すと、動かない画面が増えるだけになる。
 */
export default function FoundationScreen() {
  const platform = Platform.OS === 'web' ? 'Web (react-native-web)' : Platform.OS;

  // --- 2. ストレージ（設定） -------------------------------------------
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const defaultBpm = useSettingsStore((state) => state.defaultBpm);
  const update = useSettingsStore((state) => state.update);
  const load = useSettingsStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  // --- 3. Supabase ------------------------------------------------------
  const [reach, setReach] = useState('確かめています…');

  useEffect(() => {
    let alive = true;

    void (async () => {
      // セッションの有無は端末のストレージを読むだけ(通信しない)
      const { data } = await supabase.auth.getSession();
      const session = data.session ? 'ログイン中' : '未ログイン';

      // 往復できるかは、認証サーバーの health を叩いて確かめる。
      // 作品テーブルを読みにいくと、匿名には権限が無いので必ず 401 になり
      // (それが正しい設定)、コンソールに赤いエラーが残り続ける
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`,
          { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' } },
        );
        if (!alive) return;
        setReach(response.ok ? `届いた（${session}）` : `届かない（${response.status}）`);
      } catch {
        if (alive) setReach('届かない（通信できませんでした）');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // --- 4. Zustand（Web版からコピーしたストア） --------------------------
  const scenes = useProjectStore((state) => state.scenes);
  const addScene = useProjectStore((state) => state.addScene);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <ScrollView contentContainerClassName="gap-4 p-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-white">Choreon</Text>
          <Text className="text-sm text-neutral-400">ネイティブ版の土台（動作確認用）</Text>
        </View>

        <Row label="1. NativeWind" value="この枠と色が出ていれば効いている" />
        <Row label="環境" value={platform} />

        <Row
          label="3. Supabase"
          value={reach}
          hint="Web版と同じ Supabase を、EXPO_PUBLIC_ の鍵で見ています"
        />

        {/* 2. ストレージ：切り替えて、リロード（実機なら再起動）しても残るか */}
        <View className="gap-3 rounded-2xl border border-pink-500/60 bg-neutral-900 p-5">
          <Text className="text-xs uppercase tracking-widest text-neutral-500">
            2. 端末に覚える
          </Text>
          <Text className="text-sm text-neutral-400">
            {isLoaded ? '読み込み済み' : '読み込み中（既定値を表示）'}
          </Text>

          <Pressable
            onPress={() => update('isSnapEnabled', !isSnapEnabled)}
            className="flex-row items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 active:opacity-80"
          >
            <Text className="text-base text-white">格子に吸着させる</Text>
            <Text className="text-base font-semibold text-pink-400">
              {isSnapEnabled ? 'オン' : 'オフ'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => update('defaultBpm', defaultBpm >= 200 ? 60 : defaultBpm + 20)}
            className="flex-row items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 active:opacity-80"
          >
            <Text className="text-base text-white">既定の速さ</Text>
            <Text className="text-base font-semibold text-pink-400">{defaultBpm} BPM</Text>
          </Pressable>

          <Text className="text-xs leading-5 text-neutral-500">
            切り替えてから再読み込み（実機ならアプリを閉じて開き直す）。値が残っていれば、
            Web は localStorage、iOS/Android は AsyncStorage に書けています。
          </Text>
        </View>

        {/* 4. Web版からコピーしたストアが、無修正で動くか */}
        <View className="gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <Text className="text-xs uppercase tracking-widest text-neutral-500">
            4. Zustand（Web版からコピー）
          </Text>
          <Text className="text-base text-white">シーン {scenes.length} 件</Text>
          <Pressable
            onPress={() =>
              addScene({
                id: `scene-${scenes.length + 1}-${Date.now()}`,
                projectId: 'local',
                name: `シーン${scenes.length + 1}`,
                orderIndex: scenes.length,
                timeSeconds: scenes.length * 4,
              })
            }
            className="self-start rounded-full bg-pink-500 px-5 py-2.5 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">シーンを足す</Text>
          </Pressable>
          <Text className="text-xs leading-5 text-neutral-500">
            並び順は時刻の昇順（sceneTiming.sortScenes）。ここは Web 版のストアを
            1行も変えずに動かしています。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <Text className="text-xs uppercase tracking-widest text-neutral-500">{label}</Text>
      <Text className="text-lg text-white">{value}</Text>
      {hint ? <Text className="text-xs text-neutral-500">{hint}</Text> : null}
    </View>
  );
}
