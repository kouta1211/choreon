import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

import type { TextureId } from '@/features/theme/catalog';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useCurrentTexture, useCurrentTheme } from '@/features/theme/store/useThemeStore';

/**
 * 背景の質感。テーマ（地の色）の上に重ねる装飾。
 *
 * ■ Web版は CSS のグラデーション、こちらは SVG
 * あちらは `background-image` に linear-gradient / radial-gradient /
 * repeating-linear-gradient を重ねている。**React Native に背景画像は無い**
 * ので、同じ絵を `react-native-svg` で描き直した。ねらい（何を写した模様か）
 * と濃さは Web版 themes.css のコメントに合わせてある。
 *
 * ■ インクの色は書かない
 * `--texture-ink` と `--texture-strength` をテーマから受け取るので、
 * **暗い地では白、明るい紙では黒**として同じ模様が描かれる。
 * `--texture-shade`（暗幕の襞）だけは「陰」なので、紙でも黒のまま。
 *
 * ■ ステージの中には掛からない
 * いちばん後ろに1枚敷くだけ。ステージは自前の面（`--stage`）で塗られて
 * いるので、その下を通る（Web版と同じ）。
 *
 * ■ グレイン（フィルムの粒子）だけ作りが違う
 * Web版は SVG の `feTurbulence` をそのまま敷いている。**react-native-svg は
 * フィルタを実装していない**（iOS/Android で何も出ない）ので、
 * 小さなタイルに散らした点を敷き詰めて近似した。粒の出かたは Web版と
 * 完全には一致しない。
 */
export function TextureOverlay() {
  const theme = useCurrentTheme();
  const texture = useCurrentTexture();
  const vars = THEME_VARS[theme];

  if (texture === 'flat') return null;

  const ink = vars['--texture-ink'] ?? '255 255 255';
  const strength = Number(vars['--texture-strength'] ?? 0.09);
  const shade = Number(vars['--texture-shade'] ?? 0.32);
  const accent = vars['--accent'] ?? '#ec4899';
  const accentSoft = vars['--accent-soft'] ?? accent;

  /** テーマのインクを、濃さを掛けた色にする */
  const inked = (multiplier: number) => `rgba(${ink.split(' ').join(', ')}, ${strength * multiplier})`;

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%">
        {texture === 'horizon' ? (
          <>
            {/* ホリゾント幕 — 奥の幕に上から当たる明かり。
                上端をはっきり明るくして、下へ抜けるまでを長く取る */}
            <Defs>
              <SvgLinearGradient id="horizon" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={inked(1)} />
                <Stop offset="0.38" stopColor={inked(0.32)} />
                <Stop offset="0.72" stopColor={inked(0)} />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#horizon)" />
          </>
        ) : null}

        {texture === 'spot' ? (
          <>
            {/* スポットの円光 — 上手からの丸い明かり。
                中心を強く、縁をゆっくり落として「光の輪」の形を出す */}
            <Defs>
              <RadialGradient id="spot" cx="50%" cy="-2%" rx="58%" ry="44%">
                <Stop offset="0" stopColor={inked(1.35)} />
                <Stop offset="0.45" stopColor={inked(0.4)} />
                <Stop offset="0.78" stopColor={inked(0)} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#spot)" />
          </>
        ) : null}

        {texture === 'grid' ? (
          <>
            {/* 方眼と目盛り — 稽古場の床。細い方眼(32px)だけだと単なる
                ノイズに見えるので、4マスごとに濃い線を重ねる */}
            <Defs>
              <Pattern id="fine" width="32" height="32" patternUnits="userSpaceOnUse">
                <Line x1="0" y1="0" x2="0" y2="32" stroke={inked(0.7)} strokeWidth="1" />
                <Line x1="0" y1="0" x2="32" y2="0" stroke={inked(0.7)} strokeWidth="1" />
              </Pattern>
              <Pattern id="coarse" width="128" height="128" patternUnits="userSpaceOnUse">
                <Line x1="0" y1="0" x2="0" y2="128" stroke={inked(1.6)} strokeWidth="1" />
                <Line x1="0" y1="0" x2="128" y2="0" stroke={inked(1.6)} strokeWidth="1" />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#fine)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#coarse)" />
          </>
        ) : null}

        {texture === 'nebula' ? (
          <>
            {/* ネビュラ — 道具側の顔をした光。斜め45度の細線にしているのは、
                ステージが持っている格子と喧嘩させないため（同じ向きだと
                どちらの線を見ているのか分からなくなる）。
                光の色はテーマのアクセントから取るので、テーマを変えると
                光の色も一緒に動く */}
            <Defs>
              <Pattern
                id="diagonal"
                width="14.14"
                height="14.14"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <Line x1="0" y1="0" x2="0" y2="14.14" stroke={inked(0.38)} strokeWidth="1" />
              </Pattern>
              <RadialGradient id="glowA" cx="6%" cy="104%" rx="68%" ry="52%">
                <Stop offset="0" stopColor={accent} stopOpacity="0.17" />
                <Stop offset="0.66" stopColor={accent} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="glowB" cx="98%" cy="-6%" rx="64%" ry="50%">
                <Stop offset="0" stopColor={accentSoft} stopOpacity="0.13" />
                <Stop offset="0.64" stopColor={accentSoft} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowA)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowB)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#diagonal)" />
          </>
        ) : null}

        {texture === 'grain' ? (
          <>
            {/* グレイン — フィルムの粒子。**Web版は feTurbulence だが、
                react-native-svg はフィルタを持たない。** 小さなタイルへ
                点を散らして敷き詰め、近い見え方にしている */}
            <Defs>
              <Pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
                {GRAIN_DOTS.map(([cx, cy, r], index) => (
                  <Circle key={index} cx={cx} cy={cy} r={r} fill={inked(1.8)} />
                ))}
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#grain)" />
          </>
        ) : null}

        {texture === 'curtain' ? (
          <>
            {/* 暗幕 — 縦に落ちる襞。襞は「陰」なので、明るい紙でも黒のまま。
                幅を持たせて、折り目の山と谷が分かるようにしている */}
            <Defs>
              <Pattern id="curtain" width="18" height="8" patternUnits="userSpaceOnUse">
                <Rect x="0" y="0" width="4" height="8" fill={`rgba(0, 0, 0, ${shade})`} />
                <Rect x="4" y="0" width="3" height="8" fill={`rgba(0, 0, 0, ${shade * 0.45})`} />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#curtain)" />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * 粒の位置。**その場で乱数を振らない** — 描き直すたびに粒が跳ねて、
 * 静止しているはずの背景がちらつく。数を絞った固定の並びにしてある
 * （24×24 のタイルに9粒。多いほど本物に近いが、そのぶん重くなる）。
 */
const GRAIN_DOTS: [number, number, number][] = [
  [2, 3, 0.7],
  [9, 1, 0.5],
  [17, 5, 0.8],
  [22, 11, 0.6],
  [6, 9, 0.6],
  [13, 14, 0.8],
  [3, 19, 0.5],
  [19, 21, 0.7],
  [11, 22, 0.6],
];

/** 質感の名前。設定の見本に使う */
export const TEXTURE_ORDER: TextureId[] = [
  'flat',
  'horizon',
  'spot',
  'grid',
  'nebula',
  'grain',
  'curtain',
];
