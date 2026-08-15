import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useThemeColor, type ThemeColorName } from '@/features/theme/lib/useThemeColor';

/**
 * 線のアイコン。
 *
 * ■ なぜ自前で描くのか
 * Web版は `lucide-react` を使っているが、あれは DOM の `<svg>` を返すので
 * React Native では動かない。`lucide-react-native` を足す手もあるが、
 * **使うのは10個ほど**で、依存を1つ増やすほどの量ではない。形（24×24・
 * 線幅2・端は丸）を Web版と揃えてあるので、並べても違って見えない。
 *
 * ■ 色はクラスで渡せない
 * react-native-svg の `stroke` は色の文字列しか受け取らない（NativeWind の
 * クラスも CSS 変数も解決されない）。`useThemeColor` で表から引いた実際の
 * 値を渡している。**ここを固定色にすると、紙のテーマで白い線が消える。**
 */
export type IconName =
  | 'frame'
  | 'grid'
  | 'play'
  | 'eye'
  | 'sliders'
  | 'user'
  | 'palette'
  | 'languages'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'music'
  | 'users'
  | 'layout'
  | 'list'
  | 'focus'
  | 'trash'
  | 'pencil'
  | 'share'
  | 'download'
  | 'upload'
  | 'help';

/** lucide（24×24, stroke-width 2）と同じ座標。形が揃っていないと並べたときに浮く */
const SHAPES: Record<IconName, ReactNode> = {
  frame: (
    <>
      <Path d="M22 6H2" />
      <Path d="M22 18H2" />
      <Path d="M6 2v20" />
      <Path d="M18 2v20" />
    </>
  ),
  grid: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="M12 3v18" />
      <Path d="M3 12h18" />
    </>
  ),
  play: <Path d="M6 3l14 9-14 9z" />,
  eye: (
    <>
      <Path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  sliders: (
    <>
      <Path d="M20 7h-9" />
      <Path d="M14 17H5" />
      <Circle cx={17} cy={17} r={3} />
      <Circle cx={7} cy={7} r={3} />
    </>
  ),
  user: (
    <>
      <Circle cx={12} cy={8} r={5} />
      <Path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  palette: (
    <>
      <Path d="M12 21a9 9 0 1 1 9-9 4 4 0 0 1-4 4h-2a2 2 0 0 0-1.6 3.2 2 2 0 0 1-1.4 1.8z" />
      <Circle cx={7.5} cy={11.5} r={1} />
      <Circle cx={10.5} cy={7.5} r={1} />
      <Circle cx={15.5} cy={8.5} r={1} />
    </>
  ),
  languages: (
    <>
      <Path d="m5 8 6 6" />
      <Path d="m4 14 6-6 2-3" />
      <Path d="M2 5h12" />
      <Path d="M7 2h1" />
      <Path d="m22 22-5-10-5 10" />
      <Path d="M14 18h6" />
    </>
  ),
  'chevron-right': <Path d="m9 18 6-6-6-6" />,
  'chevron-left': <Path d="m15 18-6-6 6-6" />,
  close: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  music: (
    <>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx={6} cy={18} r={3} />
      <Circle cx={18} cy={16} r={3} />
    </>
  ),
  users: (
    <>
      <Circle cx={10} cy={8} r={5} />
      <Path d="M18 21a8 8 0 0 0-16 0" />
      <Path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
    </>
  ),
  layout: (
    <>
      <Rect x={3} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={14} width={7} height={7} rx={1} />
      <Rect x={3} y={14} width={7} height={7} rx={1} />
    </>
  ),
  list: (
    <>
      <Path d="M8 6h13" />
      <Path d="M8 12h13" />
      <Path d="M8 18h13" />
      <Path d="M3 6h.01" />
      <Path d="M3 12h.01" />
      <Path d="M3 18h.01" />
    </>
  ),
  focus: (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </>
  ),
  trash: (
    <>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </>
  ),
  pencil: (
    <>
      <Path d="M21.17 6.83a2.83 2.83 0 0 0-4-4L3 17v4h4z" />
      <Path d="m15 5 4 4" />
    </>
  ),
  share: (
    <>
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Path d="m16 6-4-4-4 4" />
      <Path d="M12 2v13" />
    </>
  ),
  download: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="m7 10 5 5 5-5" />
      <Path d="M12 15V3" />
    </>
  ),
  upload: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="m17 8-5-5-5 5" />
      <Path d="M12 3v12" />
    </>
  ),
  /** lucide の circle-help。使い方の案内をもう一度見る入口に使う */
  help: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <Path d="M12 17h.01" />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
  /** どの色で描くか。既定は控えめな文字色（Web版の `text-fg-muted` と同じ役） */
  tone?: ThemeColorName;
};

export function Icon({ name, size = 20, tone = '--text-muted' }: Props) {
  const color = useThemeColor(tone);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[name]}
    </Svg>
  );
}
