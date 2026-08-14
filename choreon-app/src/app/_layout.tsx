import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

// NativeWind の入口。Web ではこの CSS がそのまま読み込まれ、
// ネイティブでは Metro が style へ変換したものが使われる
import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppearanceProvider } from '@/components/appearance-provider';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* テーマの変数を載せた1枚。この下のクラスが色をここから読む */}
      <AppearanceProvider>
        <AppTabs />
      </AppearanceProvider>
    </ThemeProvider>
  );
}
