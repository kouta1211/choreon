import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

/**
 * ネイティブ版の最初の画面。
 *
 * いまは【基盤が生きているか】を目で確かめるためだけの画面。
 * 見ているのは3つ:
 *
 *   1. NativeWind の className が効くか(Web でも iOS/Android でも)
 *   2. 同じコードが、どの環境で動いているか(Platform.OS)
 *   3. 状態が動くか(押すと数が増える)
 *
 * ここに Choreon の画面を持ってくるのは、ロジック(Zustand / Supabase)を
 * 移してから。先に見た目だけ移すと、動かない画面が増えるだけになる。
 */
export default function HomeScreen() {
  const [taps, setTaps] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold tracking-tight text-white">
            Choreon
          </Text>
          <Text className="text-sm text-neutral-400">
            スマホで組む、ダンスのフォーメーション
          </Text>
        </View>

        {/* className が効いていれば、ピンクの枠と丸みが付く。
            素の React Native は className を知らないので、
            NativeWind が通っていなければ枠は出ない */}
        <View className="w-full max-w-sm rounded-2xl border border-pink-500/60 bg-neutral-900 p-5">
          <Text className="text-xs uppercase tracking-widest text-neutral-500">
            environment
          </Text>
          <Text className="mt-1 text-lg text-white">
            {Platform.OS === 'web' ? 'Web (react-native-web)' : Platform.OS}
          </Text>
        </View>

        <Pressable
          onPress={() => setTaps((count) => count + 1)}
          className="rounded-full bg-pink-500 px-6 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">
            タップ {taps}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
