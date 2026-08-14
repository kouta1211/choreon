import { Children, Fragment, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Segment } from '@/components/ui/button';
import { SwitchTrack } from '@/components/ui/switch';
import { resolveNumberInput } from '@/features/settings/lib/numberField';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';

/**
 * 設定の1行と、その束ね。Web版 molecules/SettingsRow.tsx の翻訳。
 *
 * ■ なぜカードで束ねるのか
 * 設定は「1つずつ意味のある選択」が縦に並ぶ画面で、区切りが無いとどこまでが
 * 同じ話なのか読めない。見出し＋角丸の面で束ねると、目次を読まずに関係が
 * 分かる（iOSの設定アプリと同じ作り）。
 *
 * ■ 行の高さは44px以上
 * 稽古場で片手で触るので、設定も例外にしない。
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  /** 省略できる。設定は束ごとに1画面ずつ見せるので、シートの見出しが
   * 束の名前になっている。そこで同じ言葉を2度出さないため */
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  // Web版は `divide-y` の1行で済ませているが、NativeWind にその変換は無い。
  // **行の間にだけ**線を挟む（先頭の上と末尾の下には出さない）
  const rows = Children.toArray(children);

  return (
    <View className="gap-2">
      {title ? (
        <Text className="px-1 text-xs uppercase tracking-widest text-fg-muted">{title}</Text>
      ) : null}

      <View className="overflow-hidden rounded-2xl bg-surface">
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View className="h-px bg-line" /> : null}
            {row}
          </Fragment>
        ))}
      </View>

      {description ? (
        <Text className="px-1 text-xs leading-5 text-fg-muted">{description}</Text>
      ) : null}
    </View>
  );
}

/**
 * 押すと切り替わる行。
 *
 * 的は行ぜんぶ。React Native では入れ子の押せるものが素直に動かないので、
 * トグル（SwitchTrack）は見た目だけを持ち、押下は行が拾う。
 * Web版が「ボタンの入れ子は不正なHTML」を理由に同じ形にしているので、
 * 結果として作りが揃った。
 */
export function SettingsSwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      className="min-h-11 flex-row items-center gap-4 px-4 py-3 active:opacity-70"
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base text-fg-strong">{label}</Text>
        {description ? (
          <Text className="text-xs leading-snug text-fg-muted">{description}</Text>
        ) : null}
      </View>
      <SwitchTrack checked={checked} />
    </Pressable>
  );
}

/** 3つまでの選択肢を横に並べる行 */
export function SettingsSegmentRow<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="min-h-11 gap-2 px-4 py-3">
      <View className="flex-row items-center gap-4">
        <Text className="min-w-0 flex-1 text-base text-fg-strong">{label}</Text>
        <Segment value={value} options={options} onChange={onChange} accessibilityLabel={label} />
      </View>
      {description ? (
        <Text className="text-xs leading-snug text-fg-muted">{description}</Text>
      ) : null}
    </View>
  );
}

/**
 * 数値を入れる行。単位は右に添える。
 *
 * 打っている最中の文字列はここで預かり、**欄から離れた時点で1回だけ**
 * 数値にして丸める（規則は `resolveNumberInput`）。
 */
export function SettingsNumberRow({
  label,
  description,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  // カーソル（選択範囲）の色だけはクラスで渡せないので、表から引く
  const accent = useThemeColor('--accent');

  // 入力中の【文字列】。数値にしてしまうと "1" と "1." の区別が消え、
  // 小数を打っている途中で勝手に整形されてしまう
  const [draft, setDraft] = useState(String(value));

  // 外から値が変わったとき（設定の初期化・端末から読み終えたとき）に追い付く。
  // useEffect で setState する形は使わない — 描画が終わってからもう一度
  // 描き直すことになる。**描画の途中で前回の値と比べて直す**のが React の
  // 言う正しい形（Web版と同じ書き方）
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const commit = () => {
    const resolved = resolveNumberInput(draft, min, max);
    if (resolved === null) {
      setDraft(String(value)); // 数でないものは、前の値に戻すだけ
      return;
    }
    setDraft(String(resolved));
    if (resolved !== value) onChange(resolved);
  };

  return (
    <View className="min-h-11 gap-2 px-4 py-3">
      <View className="flex-row items-center gap-4">
        <Text className="min-w-0 flex-1 text-base text-fg-strong">{label}</Text>
        <View className="shrink-0 flex-row items-center gap-1 rounded-lg bg-surface-raised px-3 py-1.5">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            // 確定して閉じる。スマートフォンでは欄の外を押しにくいので、
            // キーボードの完了だけでも確定できるようにしておく
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel={label}
            className="w-14 text-right font-mono text-base text-fg"
            selectionColor={accent}
          />
          <Text className="text-fg-muted">{unit}</Text>
        </View>
      </View>
      {description ? (
        <Text className="text-xs leading-snug text-fg-muted">{description}</Text>
      ) : null}
    </View>
  );
}

/**
 * 押すと1段潜る行（設定の1枚目に並ぶ「舞台」「目盛り」…）。
 *
 * 中に何が入っているかを2段目に添える。名前だけを並べると、探している項目が
 * どの束にあるかを開いて確かめることになり、1枚に全部並べていたときと
 * 手数が変わらない。
 */
export function SettingsNavRow({
  label,
  summary,
  icon,
  onPress,
}: {
  label: string;
  summary: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-11 flex-row items-center gap-4 px-4 py-3 active:opacity-70"
    >
      <Icon name={icon} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base text-fg-strong">{label}</Text>
        <Text className="text-xs leading-snug text-fg-muted">{summary}</Text>
      </View>
      <Icon name="chevron-right" size={18} />
    </Pressable>
  );
}

/** 押すと何かが起きる行（ログアウト・初期化など） */
export function SettingsActionRow({
  label,
  description,
  icon,
  onPress,
  isDangerous = false,
  disabled = false,
}: {
  label: string;
  description?: string;
  icon?: IconName;
  onPress: () => void;
  /** 取り返しのつかない操作。面は塗らず、文字だけで示す
   * — 面を赤くすると、ステージの赤いダンサーと同じ強さになる */
  isDangerous?: boolean;
  disabled?: boolean;
}) {
  // 危ないものの色は【テーマの赤】（ダンサーの2番目の色）。Web版が
  // `var(--dancer-2)` を使っているのと同じ値で、紙のテーマでは
  // 紙に映える朱色になる
  const danger = useThemeColor('--dancer-2');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`min-h-11 flex-row items-center gap-4 px-4 py-3 ${
        disabled ? 'opacity-50' : 'active:opacity-70'
      }`}
    >
      {icon ? <Icon name={icon} /> : null}
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className={isDangerous ? 'text-base' : 'text-base text-fg-strong'}
          style={isDangerous ? { color: danger } : undefined}
        >
          {label}
        </Text>
        {description ? (
          <Text className="text-xs leading-snug text-fg-muted">{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
