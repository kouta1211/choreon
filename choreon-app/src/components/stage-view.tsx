import { useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';

import { DraggableDancer } from '@/components/draggable-dancer';
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
 * ■ Web版との違いは、寸法の決め方と指の扱い
 * 形は CSS と同じ考え方（aspectRatio）でそのまま持ってこられた。格子は
 * Web が linear-gradient の繰り返しで描いていたが、背景画像が使えないので
 * 線を View で並べる。指の扱いは dnd-kit ではなく Gesture Handler
 * （DraggableDancer 参照）。
 *
 * ■ 色は Web版と同じクラス名
 * `bg-stage` `border-line-strong` `bg-stage-grid` は tailwind.config.js が
 * CSS 変数へ結び付けている。画面のコードは書き換えずに行き来できる。
 *
 * ■ ステージの実寸を測る理由
 * 指の移動量は px で来る。ステージ座標(ユニット)へ直すには、いま画面上で
 * ステージが何 px なのかが要る。onLayout で1回測って持っておく。
 */
export function StageView({ stageWidthUnits, stageHeightUnits }: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const gridMode = useUIStore((state) => state.gridMode);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const sceneId = selectedSceneId ?? scenes[0]?.id ?? '';
  const positions = positionsBySceneId[sceneId] ?? {};

  return (
    <View className="gap-2">
      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? '客席側' : 'バックステージ'}
      </Text>

      <View
        onLayout={handleLayout}
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
            <DraggableDancer
              key={position.dancerId}
              dancer={dancer}
              x={position.xCoordinate}
              y={position.yCoordinate}
              screenY={screenY}
              stageWidthUnits={stageWidthUnits}
              stageHeightUnits={stageHeightUnits}
              stageSize={stageSize}
              isAudienceOnTop={isAudienceOnTop}
              isSnapEnabled={isSnapEnabled}
              showName={dancerNameDisplay === 'always'}
              onDragEnd={({ x, y }) =>
                // いまは端末の中だけ。Supabase への保存は、認証を移してから
                updateDancerPosition(sceneId, position.dancerId, {
                  xCoordinate: x,
                  yCoordinate: y,
                })
              }
            />
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
