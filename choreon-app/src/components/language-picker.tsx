import { Pressable, Text, View } from 'react-native';

import { LOCALES, LOCALE_LABELS } from '@/features/i18n/lib/locale';
import { useLocaleStore, useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 言語を選ぶ。
 *
 * 呼び名（日本語 / English / 한국어）は**訳さない**。どの言語で見ていても、
 * 自分の言葉が自分の言葉で読める（Web版 LOCALE_LABELS と同じ判断）。
 *
 * まだ一度も選んでいない人には端末の言語で出す（`useLocaleStore`）。
 */
export function LanguagePicker() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.language.section}
      </Text>

      <View className="flex-row gap-2">
        {LOCALES.map((id) => {
          const isCurrent = id === locale;
          return (
            <Pressable
              key={id}
              onPress={() => setLocale(id)}
              accessibilityRole="button"
              accessibilityLabel={LOCALE_LABELS[id]}
              accessibilityState={{ selected: isCurrent }}
              className={`flex-1 items-center rounded-xl py-2.5 active:opacity-80 ${
                isCurrent
                  ? 'border border-accent bg-accent-row'
                  : 'border border-line bg-surface-raised'
              }`}
            >
              <Text
                className={`text-sm ${isCurrent ? 'text-fg-strong' : 'text-fg-muted'}`}
              >
                {LOCALE_LABELS[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-xs leading-5 text-fg-muted">{t.language.note}</Text>
    </View>
  );
}
