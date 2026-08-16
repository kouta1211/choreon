import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { useThemeColor } from '@/features/theme/lib/useThemeColor';

/** 中心から引く放射線の角度。0/45/90/135 で8方向ぶん（線は中心を貫くため） */
const SPOKE_ANGLES = [0, 45, 90, 135];

type Props = {
  widthUnits: number;
  heightUnits: number;
  /** ステージの実寸（px）。線の太さを実寸の1pxに保つのに要る */
  stageWidthPx: number;
};

/**
 * 中心からの「距離」と「角度」でステージを読むための目盛り。格子の代わりに敷く。
 * Web版 ConcentricGuides の翻訳。
 *
 * ■ 何のためにあるか
 * 円や弧の隊形を組むとき、直交する格子は数えにくい。中心から何マスめの輪に
 * 誰がいるか、どの方向へ開いているかで捉えられるようにする。
 *
 * ■ なぜ足りていなかったか
 * `GridMode` には最初から `"circle"` が入っていた（Web版から型ごと持って
 * きたため）のに、**選ぶ場所も描く処理も無かった**。仮に選べたとしても
 * 格子が消えるだけで、何も出ない状態だった。
 *
 * ■ viewBox はマス目そのもの
 * ステージは常に「横ユニット : 縦ユニット」の比で描かれる（`stage-view` が
 * 実寸を計算している）ので、viewBox を同じ比にしておけば引き伸ばしは
 * 起きず、**円は真円のまま**になる。ほかの重ね物（導線など）は
 * `viewBox="0 0 100 100"` を使っているが、あちらは伸びても線の向きが
 * 変わるだけで済む。円はそうはいかないのでここだけ別にしている。
 *
 * ■ 線の太さ
 * Web版は `vectorEffect="non-scaling-stroke"` で拡大率から切り離している。
 * react-native-svg は3つの環境で効き方が揃わないので、**実寸から逆算**して
 * マス目の単位へ直す（ステージが大きくなっても1pxの細さを保つ）。
 */
export function ConcentricGuides({ widthUnits, heightUnits, stageWidthPx }: Props) {
  const spoke = useThemeColor('--text');
  const ring = useThemeColor('--accent');

  const centerX = widthUnits / 2;
  const centerY = heightUnits / 2;
  // 上下の縁までに収まる輪だけを、中心から1マスごとに引く。
  // 比率で3本に決め打つと、ステージの広さで1本の意味が変わって
  // 「何マスめ」と読めなくなる
  const radii = Array.from({ length: Math.floor(heightUnits / 2) }, (_, i) => i + 1);

  // 実寸の1px が、マス目の単位でいくつぶんか
  const hairline = stageWidthPx > 0 ? widthUnits / stageWidthPx : 0.02;

  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${widthUnits} ${heightUnits}`}
        preserveAspectRatio="none"
      >
        {/* 放射線。輪より先に描いて、交点では輪が上に来るようにする */}
        {SPOKE_ANGLES.map((angle) => {
          // 端点を自分で出す。`rotation` / `origin` を使うと
          // react-native-svg が web で `transform-origin` を素の DOM 属性
          // として渡してしまい、毎回「Invalid DOM property」の警告が出る
          const radians = (angle * Math.PI) / 180;
          const dx = Math.cos(radians) * widthUnits;
          const dy = Math.sin(radians) * widthUnits;
          return (
            <Line
              key={angle}
              x1={centerX - dx}
              y1={centerY - dy}
              x2={centerX + dx}
              y2={centerY + dy}
              stroke={spoke}
              strokeOpacity={0.05}
              strokeWidth={hairline}
            />
          );
        })}

        {radii.map((radius) => (
          <Circle
            key={radius}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={ring}
            strokeOpacity={0.16}
            strokeWidth={hairline}
          />
        ))}

        {/* 中心。左右対称の軸でもある。広いステージでも点のまま見えるよう、
            半径は縦幅に対する比で決める */}
        <Circle cx={centerX} cy={centerY} r={heightUnits * 0.015} fill={ring} />
      </Svg>
    </View>
  );
}
