import { View, Text } from 'react-native';

import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * ステージ1枚。**ネイティブ版で最初の「Choreonらしい画面」**。
 *
 * ■ Web版との違いは、寸法の決め方だけ
 * Web版(Stage.tsx)は CSS の aspect-ratio と container query で、
 * 「幅いっぱい／高さいっぱいのうち、収まる方」を CSS に決めさせている。
 * React Native に aspect-ratio はある(style の aspectRatio)ので、
 * **同じ考え方をそのまま持ってこられる**。格子は Web が
 * linear-gradient の繰り返しで描いていたが、こちらは背景画像が使えないので
 * 線を View で並べる。
 *
 * ■ 色は Web版と同じクラス名
 * `bg-stage` `border-line-strong` `bg-stage-grid` は tailwind.config.js が
 * CSS 変数へ結び付けている(global.css)。**画面のコードはクラス名の
 * 書き換え無しで行き来できる。**
 *
 * ■ まだ持ってきていないもの
 * ドラッグ・回転・導線・バミリ・顔被り。これらは dnd-kit と SVG に
 * 依存していて、React Native では別の作り(Reanimated / react-native-svg)に
 * なる。まずは「置いてあるものが同じに見えるか」だけを確かめる。
 */
export function StageView({ stageWidthUnits, stageHeightUnits }: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const gridMode = useUIStore((state) => state.gridMode);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);

  const sceneId = selectedSceneId ?? scenes[0]?.id ?? '';
  const positions = positionsBySceneId[sceneId] ?? {};

  return (
    <View className="gap-2">
      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? '客席側' : 'バックステージ'}
      </Text>

      <View
        className="w-full overflow-hidden rounded-stage border border-line-strong bg-stage"
        style={{ aspectRatio: stageWidthUnits / stageHeightUnits }}
      >
        {gridMode === 'square' && (
          <GridLines widthUnits={stageWidthUnits} heightUnits={stageHeightUnits} />
        )}

        {Object.values(positions).map((position) => {
          const dancer = dancers[position.dancerId];
          if (!dancer) return null;

          // 客席を上にして描くときは、保存された座標は動かさず【描く向きだけ】
          // 上下を鏡にする(Web版 stageFlip.ts と同じ考え方)
          const screenY = isAudienceOnTop
            ? stageHeightUnits - position.yCoordinate
            : position.yCoordinate;

          return (
            <View
              key={position.dancerId}
              className="absolute items-center"
              style={{
                left: `${(position.xCoordinate / stageWidthUnits) * 100}%`,
                top: `${(screenY / stageHeightUnits) * 100}%`,
                transform: [{ translateX: -14 }, { translateY: -14 }],
              }}
            >
              <View
                className="h-7 w-7 rounded-full"
                style={{ backgroundColor: dancer.color }}
              />
              {dancerNameDisplay === 'always' && dancer.name ? (
                <Text className="mt-0.5 text-[10px] text-fg-strong">{dancer.name}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? 'バックステージ' : '客席側'}
      </Text>
    </View>
  );
}

/**
 * 格子。1マス = 実寸90cm で、これが距離の手がかりになる。
 *
 * Web版は背景の linear-gradient を繰り返して描いていた。React Native に
 * 背景画像は無いので、線を1本ずつ置く。マス目の数だけ View が増えるが、
 * ステージは最大30マスなので数十本で収まる。
 */
function GridLines({
  widthUnits,
  heightUnits,
}: {
  widthUnits: number;
  heightUnits: number;
}) {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      {Array.from({ length: widthUnits - 1 }, (_, index) => (
        <View
          key={`v${index}`}
          className="absolute top-0 bottom-0 w-px bg-stage-grid"
          style={{ left: `${((index + 1) / widthUnits) * 100}%` }}
        />
      ))}
      {Array.from({ length: heightUnits - 1 }, (_, index) => (
        <View
          key={`h${index}`}
          className="absolute right-0 left-0 h-px bg-stage-grid"
          style={{ top: `${((index + 1) / heightUnits) * 100}%` }}
        />
      ))}
    </View>
  );
}
