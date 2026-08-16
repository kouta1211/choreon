import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ErrorBoundaryProps } from 'expo-router';

import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 画面が落ちたときに出す板。
 *
 * ■ なぜ要るか
 * これが無いと、描いている途中で例外が出た瞬間に**真っ白**になる
 * （開発中は赤い画面が出るが、配ったアプリでは何も出ない）。
 * 稽古の最中に画面が消えて、何が起きたのか分からないまま終わる。
 *
 * ■ 作ったものは消えない、と先に言う
 * いちばん気になるのはそこ。下書きは端末に残してあり
 * （`guestDraft.ts`）、ログインしている作品はサーバーにある。
 * **開き直せば戻る**ことを、謝る前に書く。
 *
 * ■ 中身も出す
 * 「エラーが発生しました」だけだと、報告のしようがない。文言をそのまま
 * 出して、写真を撮って送れる形にする（user が実機で確かめる進め方なので、
 * ここが唯一の手がかりになる）。
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const t = useT();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text className="text-xl text-fg-strong">{t.crash.title}</Text>
        <Text className="text-sm leading-6 text-fg-sub">{t.crash.safe}</Text>

        <Pressable
          onPress={() => void retry()}
          accessibilityRole="button"
          className="min-h-12 items-center justify-center rounded-xl bg-accent active:opacity-80"
        >
          <Text className="text-base font-semibold text-accent-fg">{t.crash.retry}</Text>
        </Pressable>

        <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs text-fg-muted">{t.crash.detail}</Text>
          {/* 選んでコピーできるようにする。写真より正確に送れる */}
          <Text selectable className="font-mono text-xs leading-5 text-fg">
            {error.message}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
