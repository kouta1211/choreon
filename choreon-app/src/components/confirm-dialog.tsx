import { useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vars } from 'nativewind';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/** 中央に置くか、下端に寄せるかの境目（Sheet と同じ値） */
const WIDE_SCREEN = 1200;

/**
 * 取り消せない操作の前に出す確認。Web版 ConfirmDialog の翻訳。
 *
 * ■ これまでは「2タップ」で代用していた
 * `Alert.alert` は react-native-web では何も出ないので、ダンサーとシーンの
 * 削除は「押すと文言が『本当に消す』に変わり、もう一度押すと消える」形に
 * していた。**その場に残るのは変わった文言だけで、一緒に何が消えるのかを
 * 出せない**（シーンを消すとそこの立ち位置も消える、など）。ここを Web版と
 * 同じ板にして、消えるものを数で示す。
 *
 * ■ 履歴との違いを必ず書く
 * このアプリには「元に戻す」があるので、消したものも戻せると思われやすい。
 * 戻せるもの（移動・向き）と戻せないもの（削除）の境目を、この場で出す。
 *
 * ■ 狭い画面では下寄せ
 * ボタンが親指の届く高さに来る。中央に置くと、片手で持ったまま
 * 「やめる」に指が届かない。
 *
 * ■ 実行中はボタンを止める
 * 削除は通信を伴うので、二度押しすると2回目が「もう無い行の削除」になる。
 * 幕を押しても、実行中は閉じない（途中で画面だけ消えると、終わったのか
 * どうか分からない）。
 *
 * Toast と同じく、ストアの中身を1箇所で描くだけの部品。呼ぶ側は
 * `requestConfirm()` を呼ぶだけでよく、開閉の状態を自前で持たない。
 */
export function ConfirmDialog() {
  const t = useT();
  const request = useUIStore((state) => state.confirm);
  const closeConfirm = useUIStore((state) => state.closeConfirm);
  const theme = useCurrentTheme();
  const danger = useThemeColor('--dancer-2');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_SCREEN;

  const [isRunning, setIsRunning] = useState(false);

  const handleConfirm = async () => {
    if (!request) return;
    setIsRunning(true);
    try {
      await request.onConfirm();
      closeConfirm();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal
      visible={Boolean(request)}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isRunning) closeConfirm();
      }}
      statusBarTranslucent
    >
      {/* Modal はテーマの外側に描かれるので、ここでもう一度当てる
          （sheet.tsx と同じ理由） */}
      <View
        style={vars(THEME_VARS[theme])}
        className={`flex-1 ${isWide ? 'items-center justify-center' : 'justify-end'} p-4`}
      >
        <Pressable
          onPress={() => {
            if (!isRunning) closeConfirm();
          }}
          accessibilityRole="button"
          accessibilityLabel={t.confirm.cancel}
          className="absolute inset-0 bg-scrim opacity-60"
        />

        <View
          accessibilityViewIsModal
          style={{ marginBottom: isWide ? 0 : Math.max(insets.bottom, 4) }}
          className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-line bg-page"
        >
          {/* 不透明な地の上に板の色を重ねる（sheet.tsx と同じ理由） */}
          <View pointerEvents="none" className="absolute inset-0 bg-surface" />

          <View className="items-center gap-3 px-5 pt-6 pb-4">
            <Text className="text-center text-lg text-fg-strong">{request?.title}</Text>

            {request?.description ? (
              <Text className="text-center text-sm leading-5 text-fg-sub">
                {request.description}
              </Text>
            ) : null}

            {/* 一緒に消えるものを数で出す。「シーンを消す」だけでは、
                そこに入れた立ち位置まで消えることが伝わらない */}
            {request?.meta && request.meta.length > 0 ? (
              <View className="flex-row flex-wrap justify-center gap-1.5">
                {request.meta.map((item) => (
                  <View
                    key={item}
                    className="h-7 justify-center rounded-full bg-surface-raised px-3"
                  >
                    <Text className="font-mono text-xs text-fg">{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* 履歴との違い。これが無いと「元に戻す」で戻せると思われる */}
            <Text className="text-center text-xs leading-5 text-fg-muted">
              <Text className="text-fg-sub">{t.confirm.cannotUndo}</Text>
              {t.confirm.undoNote}
            </Text>
          </View>

          {/* 下辺で2つに割る。面ではなく【文字の色】で危険を示す
              — 赤い面はステージの赤いダンサーと同じ強さになる */}
          <View className="flex-row border-t border-line">
            <Pressable
              onPress={closeConfirm}
              disabled={isRunning}
              accessibilityRole="button"
              className={`h-14 flex-1 items-center justify-center border-r border-line ${
                isRunning ? 'opacity-50' : 'active:opacity-70'
              }`}
            >
              <Text className="text-base text-fg-sub">{t.confirm.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleConfirm()}
              disabled={isRunning}
              accessibilityRole="button"
              className={`h-14 flex-1 items-center justify-center ${
                isRunning ? 'opacity-50' : 'active:opacity-70'
              }`}
            >
              <Text className="text-base" style={{ color: danger }}>
                {isRunning ? t.confirm.deleting : (request?.confirmLabel ?? t.confirm.delete)}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
