import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { buildThumbnailDots } from '@/features/scene/lib/sceneThumbnail';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

type Props = {
  sceneId: string;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** ミニチュアの幅（px）。帯のカードは狭く、一覧は広く出す */
  widthPx: number;
};

/** 点の半径（幅に対する比）。Web版 sceneThumbnail.ts と同じ 0.04 */
const DOT_RADIUS_RATIO = 0.04;

/**
 * シーン1コマ分のミニチュア。各ダンサーの立ち位置を色付きの点で描くだけ
 * （名前や向きは出さない。小さすぎて読めないので、「どんな配置か」が
 * ひと目で分かれば十分）。
 *
 * ■ Web版のような「焼き込み」はしない
 * あちらは点を SVG の dataURL に焼いて `<img>` で貼り、そのために
 * 「テーマが変わったら焼き直す」フック（useSceneThumbnails）と
 * 「ストアに焼いた絵を持つ」仕掛けが要る。**こちらは `<Circle>` を
 * その場で並べるだけ**なので、テーマを変えれば次の描画でそのまま追従する。
 * 古い絵が残る余地が無い。
 *
 * ■ 向きはステージに合わせる
 * 客席を上にしているときは、ミニチュアも上下を鏡にする（`buildThumbnailDots`
 * が受け持つ）。見比べるためのものなので、向きが違うと役に立たない。
 */
export function SceneThumbnail({
  sceneId,
  stageWidthUnits,
  stageHeightUnits,
  widthPx,
}: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const positions = useProjectStore((state) => state.positionsBySceneId[sceneId]);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const theme = useCurrentTheme();

  const heightPx = (widthPx * stageHeightUnits) / stageWidthUnits;
  const dots = buildThumbnailDots(
    positions ?? {},
    dancers,
    stageWidthUnits,
    stageHeightUnits,
    (color) => themedDancerColor(color, theme),
    isAudienceOnTop,
  );

  return (
    <View
      style={{ width: widthPx, height: heightPx }}
      className="overflow-hidden rounded border border-line bg-stage"
    >
      <Svg width={widthPx} height={heightPx}>
        {dots.map((dot, index) => (
          <Circle
            key={index}
            cx={dot.x * widthPx}
            cy={dot.y * heightPx}
            r={widthPx * DOT_RADIUS_RATIO}
            fill={dot.color}
          />
        ))}
      </Svg>
    </View>
  );
}
