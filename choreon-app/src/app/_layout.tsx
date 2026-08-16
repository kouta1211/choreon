import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// NativeWind の入口。Web ではこの CSS がそのまま読み込まれ、
// ネイティブでは Metro が style へ変換したものが使われる
import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppearanceProvider } from '@/components/appearance-provider';
import { CrashScreen } from '@/components/crash-screen';
import { configureAudioMode } from '@/features/music/lib/audioMode';

SplashScreen.preventAutoHideAsync();

/**
 * 画面の器。
 *
 * ■ タブを外した
 * Expo の見本に付いていた「Home / Explore」のタブは、**中身が Expo の
 * デモ**で、上に「Expo Starter」と出ていた。テーマも効かない（OS 側の
 * 部品なので、こちらの CSS 変数が届かない）ので、いま画面は1枚だけ、と
 * 素直に見せる形にした。画面が増えたら、そのときに navigation を選ぶ。
 *
 * ■ expo-router の ThemeProvider も外した
 * あれは端末の明暗（useColorScheme）で React Navigation の色を決めるもの。
 * Choreon の見た目は**テーマで決まる**（`AppearanceProvider`）ので、
 * 2つの色の決め方が並ぶと食い違う。ヘッダーも出していないので出番が無い。
 */
export default function RootLayout() {
  // 音の区分は**アプリに1つ**なので、いちばん外側で1回だけ決める。
  // これを呼ばないと、マナーモードの間は曲もメトロノームも鳴らない
  useEffect(() => {
    void configureAudioMode();
  }, []);

  return (
    <AppearanceProvider>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" />
        {/* 共有リンクを**このアプリで**開いたとき。読むだけの画面
            （`view/[projectId].tsx`）。ブラウザで開けば Web版のビューアが出る */}
        <Stack.Screen name="view/[projectId]" />
      </Stack>
    </AppearanceProvider>
  );
}

/**
 * 描いている途中で例外が出たときの受け皿。**expo-router がこの名前を
 * 見て**、この下の画面が落ちたら差し替える。
 *
 * 無いと真っ白になる（開発中は赤い画面が出るが、配ったアプリでは何も
 * 出ない）。稽古の最中に画面が消えて、何が起きたか分からないまま終わる。
 */
export { CrashScreen as ErrorBoundary };
