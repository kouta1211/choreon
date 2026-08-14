import { View } from 'react-native';

import { LanguagePicker } from '@/components/language-picker';
import { ThemePicker } from '@/components/theme-picker';

/**
 * 設定の「アプリ」。テーマと言語。
 *
 * 既にある2つの部品を並べているだけで、新しいものを書いていない。
 * どちらも「見本を横に並べて選ぶ」形で、設定の行（ラベル＋右にトグル）に
 * 収まらない — 押した結果がその場で見えることに意味がある選択なので、
 * 行へ押し込まずにそのまま置いた。
 *
 * Web版にある「見た目（暗い/明るい/端末）」と「自動保存」はまだ無い。
 * 前者はテーマを選べば済んでいて、後者は貯めた書き込みを送り直す仕掛けが
 * ネイティブ版に無い（persist は常に送る）。
 */
export function SettingsAppSection() {
  return (
    <View className="gap-4">
      <ThemePicker />
      <LanguagePicker />
    </View>
  );
}
