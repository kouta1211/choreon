import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';

/**
 * 押せるもの。
 *
 * ■ Web版（PressableButton）との対応
 * あちらが受け持っているのは「押したときにどう沈むか」だけで、色と大きさは
 * 呼び出し側の className が決めていた。React Native の `Pressable` は
 * `active:` のクラスで同じことができるので、**ここでは代わりに
 * 「よく出てくる3つの塗り」を引き受ける**。ネイティブ版は同じ組み合わせ
 * （丸いアクセントの錠剤・枠線だけの四角）を各画面で書き写していて、
 * そちらの重複の方が実害が大きかった。
 *
 * ■ 沈み方は透明度だけ
 * 拡大・縮小のアニメーションはフェーズ4（Reanimated）でまとめて入れる。
 * ここで `Animated` を混ぜると、後で全部書き直すことになる。
 *
 * ■ 的は44px以上
 * 稽古場で片手で触るので、小さい丸ボタンでも高さは下げない
 * （Web版 SettingsRow の `min-h-target` と同じ判断）。
 */
export type ButtonKind = 'primary' | 'secondary' | 'ghost';

type Props = {
  label?: string;
  onPress: () => void;
  kind?: ButtonKind;
  /** ラベルの左に置くアイコン。ラベルを省くとアイコンだけの丸ボタンになる */
  icon?: IconName;
  disabled?: boolean;
  /** 高さを詰めたいとき（帯の中に並べる小さな操作）。的は44pxを割る */
  isCompact?: boolean;
  /** 追加の見た目。幅の指定など、呼び出し側でしか決められないもの */
  className?: string;
  accessibilityLabel?: string;
  children?: ReactNode;
};

const SURFACE: Record<ButtonKind, string> = {
  primary: 'bg-accent',
  secondary: 'border border-line-strong bg-surface-raised',
  ghost: '',
};

const LABEL: Record<ButtonKind, string> = {
  primary: 'text-accent-fg font-semibold',
  secondary: 'text-fg-strong',
  ghost: 'text-fg-sub',
};

/** アイコンの色。塗った面の上では文字と同じ色にしないと沈んで見える */
const ICON_TONE = {
  primary: '--accent-fg',
  secondary: '--text-strong',
  ghost: '--text-sub',
} as const;

export function Button({
  label,
  onPress,
  kind = 'secondary',
  icon,
  disabled = false,
  isCompact = false,
  className = '',
  accessibilityLabel,
  children,
}: Props) {
  const isIconOnly = !label && !children;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      className={`flex-row items-center justify-center gap-2 rounded-full ${
        isIconOnly ? 'aspect-square' : 'px-4'
      } ${isCompact ? 'min-h-9' : 'min-h-11'} ${SURFACE[kind]} ${
        disabled ? 'opacity-50' : 'active:opacity-70'
      } ${className}`}
    >
      {icon ? <Icon name={icon} size={18} tone={ICON_TONE[kind]} /> : null}
      {label ? <Text className={`text-sm ${LABEL[kind]}`}>{label}</Text> : null}
      {children}
    </Pressable>
  );
}

/**
 * 2つ以上から1つを選ぶ帯（Web版 SettingsSegmentRow の中の並び）。
 *
 * 選択肢が3つまでなら、開いて選ぶより横に並べた方が早い。
 * 設定と再生の速さの両方で使うので、行から切り離してある。
 */
export function Segment<T extends string | number>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className="shrink-0 flex-row rounded-lg bg-surface-raised p-0.5"
    >
      {options.map((option) => {
        const isOn = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isOn }}
            className={`h-8 min-w-11 items-center justify-center rounded-md px-3 active:opacity-70 ${
              isOn ? 'bg-surface-strong' : ''
            }`}
          >
            <Text className={`text-xs ${isOn ? 'text-fg-strong' : 'text-fg-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
