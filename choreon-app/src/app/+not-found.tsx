import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 知らない道を開いたとき。
 *
 * ■ なぜ要るか
 * これが無いと、expo-router が持っている素の画面が出る。**英語で、
 * テーマも効かない**ので、別のアプリに飛ばされたように見える。
 * 共有リンクの打ち間違いや、古いリンクを踏んだときにここへ来る。
 */
export default function NotFound() {
  const t = useT();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-page">
      <View className="max-w-[420px] gap-3 px-6">
        <Text className="text-center text-lg text-fg-strong">{t.notFound.title}</Text>
        <Text className="text-center text-sm leading-6 text-fg-sub">{t.notFound.body}</Text>
        <Link href="/" className="text-center text-base text-accent-soft">
          {t.notFound.home}
        </Link>
      </View>
    </SafeAreaView>
  );
}
