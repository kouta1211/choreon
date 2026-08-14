import { View } from 'react-native';

/**
 * トグルの【見た目だけ】。押す仕掛けは持たない。
 *
 * Web版（atoms/Switch.tsx の SwitchTrack）と同じ寸法にしてある
 * — 帯 44×24、つまみ 20、入のときは右へ 22px。
 *
 * ■ React Native の `Switch` を使わない
 * 標準の `Switch` は iOS と Android で見た目が変わり、色も限られた props
 * でしか触れない。10テーマぶんの塗り分けに乗らないので、Web版と同じく
 * 自分で描いている。
 *
 * ■ 名前を SwitchTrack のままにしている
 * 中身だけの部品であることを名前で示すため（行そのものを押す的にして、
 * 沈むのはここだけ、という Web版の作りをそのまま持ってきている）。
 * `react-native` の `Switch` と衝突しない利点もある。
 */
export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <View
      className={`h-6 w-11 shrink-0 justify-center rounded-full ${
        checked ? 'bg-accent' : 'bg-line-strong'
      }`}
    >
      <View
        className={`absolute h-5 w-5 rounded-full bg-white ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </View>
  );
}
