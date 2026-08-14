import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vars } from 'nativewind';

import { Icon } from '@/components/ui/icon';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** シートの見出し。読み上げ用のラベルも兼ねる */
  title: string;
  /** 中で段を潜っているときに渡す。見出しの左に戻る矢印が出る。
   * 閉じる（幕・×）とは別の役で、こちらは1段だけ戻る */
  onBack?: () => void;
  /** 見出しの右に添える補足（「5件 · 合計 7.4s」など） */
  titleRight?: ReactNode;
  /** true なら画面の大部分を占める高さにする（一覧のように件数が伸びるもの）。
   * false なら中身の高さぶんだけ下に貼り付く */
  isTall?: boolean;
  children: ReactNode;
};

/** ここを超える幅では、下から出すのをやめて中央のダイアログにする（Web版と同じ境目） */
const WIDE_SCREEN = 1200;

/**
 * 一時的に開く重ね物。Web版 BottomSheet の翻訳。
 *
 * ■ フェーズ3では「引き下げて閉じる」を入れない
 * Web版は motion で板と幕を連動させ、距離と速さの両方で閉じている。
 * ここはまず**静かに出る形**だけを作る（幕をタップ・×・端末の戻る）。
 * 指で引き下げる操作はフェーズ4で Reanimated と一緒に入れる。
 *
 * ■ Modal の中はテーマの外側にいる
 * **ここが一番の落とし穴。** `AppearanceProvider` は View を1枚かぶせて
 * `vars()` でテーマの変数を配っているが、`Modal` は画面の一番上に別の根と
 * して描かれるので、**その View の下に入らない**。何もしないとシートの中
 * だけ色が既定（ミッドナイト）に戻る。中でもう一度 `vars()` を当てている
 * のはこのため。
 *
 * ■ 広い画面では中央に出す
 * 3つの出力先のうち Web はマウスで見る。下端に貼り付いた板を画面幅いっぱい
 * に伸ばすと、見出しと中身が横に散らばって読めない（Web版が 1200px で
 * ダイアログへ切り替えているのと同じ理由）。
 */
export function Sheet({
  isOpen,
  onClose,
  onBack,
  title,
  titleRight,
  isTall = false,
  children,
}: Props) {
  const t = useT();
  const theme = useThemeStore((state) => state.preference.theme);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_SCREEN;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      // Android の戻るボタン。これが無いと閉じられない画面ができる
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={vars(THEME_VARS[theme])}
        className={`flex-1 ${isWide ? 'items-center justify-center p-6' : 'justify-end'}`}
      >
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          className="absolute inset-0 bg-scrim/60"
        />

        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            // 下端の余白は端末が持っている値ぶん（ホームバーと重ねない）。
            // 中央のダイアログでは足さない
            paddingBottom: isWide ? 0 : Math.max(insets.bottom, 12),
            maxHeight: '86%',
            ...(isTall ? { height: isWide ? undefined : '82%' } : null),
          }}
          className={`w-full max-w-[560px] border border-line bg-surface ${
            isWide ? 'rounded-2xl' : 'rounded-t-3xl border-x-0 border-b-0'
          }`}
        >
          {/* つまむための印。まだ引き下げられないが、**下から出る板である
              ことを示す手がかり**として置いている（フェーズ4でここが的になる） */}
          {isWide ? null : (
            <View className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong" />
          )}

          <View className="flex-row items-center gap-2 border-b border-line px-4 py-3">
            {onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel={t.common.back}
                className="-ml-2 h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
              >
                <Icon name="chevron-left" size={22} tone="--text-sub" />
              </Pressable>
            ) : null}

            <Text numberOfLines={1} className="min-w-0 flex-1 text-lg text-fg-strong">
              {title}
            </Text>

            {titleRight ? (
              <Text className="shrink-0 font-mono text-xs text-fg-muted">{titleRight}</Text>
            ) : null}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
              className="-mr-2 h-9 w-9 items-center justify-center rounded-lg active:opacity-70"
            >
              <Icon name="close" size={20} tone="--text-sub" />
            </Pressable>
          </View>

          <ScrollView
            className="min-h-0"
            contentContainerClassName="gap-5 p-4"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
