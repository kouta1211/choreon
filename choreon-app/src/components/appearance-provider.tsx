import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';

import { TextureOverlay } from '@/components/texture-overlay';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import {
  useCurrentTheme,
  useThemeStore,
} from '@/features/theme/store/useThemeStore';

/**
 * 選んだテーマを、この下の全部に効かせる。
 *
 * 名前が ThemeProvider でないのは、expo-router が同じ名前のものを
 * 持っているため（_layout.tsx で両方を使う）。
 *
 * ■ 仕組み
 * Web版は `<html data-theme="neon">` を書き、CSS 側の
 * `[data-theme="neon"] { --accent: … }` が変数を差し替える。ネイティブに
 * その仕掛けは無いので、**変数の表を `vars()` で View の style に載せる**。
 * NativeWind は配下のクラス（`bg-surface` など）をこの style から読むので、
 * **画面のコードは1行も変えずに**色だけ入れ替わる。
 *
 * ■ 読み終えるまで当てない
 * 端末から読むのは非同期なので、先に描くと「ミッドナイト → 選んだテーマ」と
 * 一瞬ちらつく。Web版は layout.tsx のインラインスクリプトが React より先に
 * 属性を書いてこれを避けている。こちらは読み終えるまで既定のまま描き、
 * 読み終えた時点で切り替える（暗い地から暗い地なら分からないが、紙の
 * テーマを選んでいる人には見える。ここは実機で確かめたい）。
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const theme = useCurrentTheme();
  const load = useThemeStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={vars(THEME_VARS[theme])} className="flex-1 bg-page">
      {/* 背景の質感。**いちばん後ろに1枚**。ステージは自前の面で塗られて
          いるので、その下を通る（Web版と同じ重ね方） */}
      <TextureOverlay />
      {children}
    </View>
  );
}
