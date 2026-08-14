import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, Text, type LayoutChangeEvent } from 'react-native';

import { DraggableDancer } from '@/components/draggable-dancer';
import { getSceneStep } from '@/features/canvas/lib/sceneStep';
import { useSceneWarnings } from '@/features/canvas/hooks/useSceneWarnings';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import type { Position } from '@/features/scene/types';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import {
  AXIS_LOCK_THRESHOLD_PX,
  applyRubberBand,
  interpolateDancerPoint,
  scrubProgress,
  shouldCommitScrub,
} from '@/features/canvas/lib/sceneScrub';
import { sceneDurations } from '@/features/scene/lib/sceneTiming';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * ステージ1枚。置いてある隊形を描き、指の操作を受ける。
 *
 * ■ 2種類の指の操作が同居する
 *   - ダンサーの上から始まった指 … その人を動かす(DraggableDancer)
 *   - 何も無いところから始まった指 … 横に払って前後のシーンへ(ここ)
 * 先に子(ダンサー)へ聞かれるので、住み分けは React Native の
 * 責任者(responder)の仕組みがそのまま面倒を見てくれる。Web版が
 * 「ダンサーとボタンの上から始まった指は拾わない」と自前で除外していた
 * ぶんが要らない。
 *
 * ■ 判断は Web版と同じ関数
 * 確定するかどうか(距離22% or フリック)・端でのゴム・進捗・片側にしか
 * 居ない人の出入りは `sceneScrub.ts` をコピーして使っている。**触り心地の
 * 数値がWebとスマホでずれない**ようにするため。
 */
export function StageView({ stageWidthUnits, stageHeightUnits }: Props) {
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const previousSceneId = useUIStore((state) => state.previousSceneId);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const selectScene = useUIStore((state) => state.selectScene);
  const gridMode = useUIStore((state) => state.gridMode);
  const isSwipeEnabled = useUIStore((state) => state.isSwipeSceneChangeEnabled);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const isBlindSpotCheckVisible = useUIStore((state) => state.isBlindSpotCheckVisible);
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);

  /**
   * 動かした結果をストアへ入れ、**戻せるように履歴へ積む**。
   *
   * 積むのは「操作前」と「操作後」の立ち位置まるごと（Web版
   * `usePositionCommit` と同じ形）。どのフィールドが変わった操作なのかを
   * 履歴側が知らなくてよくなる。
   */
  const commit = (
    targetSceneId: string,
    dancerId: string,
    kind: 'move' | 'rotate',
    next: Partial<Position>,
  ) => {
    const before = positionsBySceneId[targetSceneId]?.[dancerId];
    if (!before) return;
    const after = { ...before, ...next };

    updateDancerPosition(targetSceneId, dancerId, next);
    useHistoryStore.getState().push({
      kind,
      changes: [{ sceneId: targetSceneId, dancerId, before, after }],
    });
  };

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const sceneIndex = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const sceneId = scenes[sceneIndex]?.id ?? scenes[0]?.id ?? '';
  const positions = positionsBySceneId[sceneId] ?? {};

  /**
   * 次の隊形まで動くのにかける秒数。**区間の実際の長さ**を渡す。
   *
   * 区間の長さは「区間の後ろ側のシーン」が持っている（時刻の差）。1つ戻った
   * ときは、いま選んでいるシーンではなく**さっきまでいたシーン**の側が
   * その区間にあたる（Web版 DancerLayer と同じ判定を `getSceneStep` で行う）。
   * 隣り合わないシーンへ飛んだときは 0 = 瞬間移動。通っていない区間を、
   * 通ったように見せない。
   */
  const step = getSceneStep(
    scenes.map((scene) => scene.id),
    previousSceneId,
    selectedSceneId,
  );
  const durations = sceneDurations(scenes);
  const segmentIndex =
    step === 'backward'
      ? scenes.findIndex((scene) => scene.id === previousSceneId)
      : sceneIndex;
  const transitionSeconds = step === 'jump' ? 0 : (durations[segmentIndex] ?? 0);

  // ダンサーに付ける印。速すぎる移動は【次のシーンへの移動】で決まるので、
  // 次のシーンの隊形とその区間の秒数を渡す
  const nextScene = scenes[sceneIndex + 1];
  const { excessiveMoves, blockedDancerIds } = useSceneWarnings({
    positions,
    nextPositions: nextScene ? (positionsBySceneId[nextScene.id] ?? {}) : {},
    nextSceneSeconds: durations[sceneIndex + 1] ?? 0,
    isBlindSpotCheckVisible,
  });

  /** 払っている最中の進み具合。触っていなければ null */
  const [scrub, setScrub] = useState<{ targetSceneId: string; progress: number } | null>(
    null,
  );

  // PanResponder の中から最新の状態を読む(作り直すと払っている最中に
  // 掴んでいる相手が入れ替わるため、閉じ込めずに ref 経由で読む)
  const latest = useRef({ scenes, sceneIndex, stageSize, isSwipeEnabled, selectScene });
  latest.current = { scenes, sceneIndex, stageSize, isSwipeEnabled, selectScene };
  const startedAt = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (!latest.current.isSwipeEnabled) return false;
          // 縦に払ったのならページのスクロールに譲る。横だけを受け取る
          const absX = Math.abs(gesture.dx);
          const absY = Math.abs(gesture.dy);
          if (Math.max(absX, absY) < AXIS_LOCK_THRESHOLD_PX) return false;
          return absX > absY;
        },

        onPanResponderGrant: () => {
          startedAt.current = Date.now();
        },

        onPanResponderMove: (_event, gesture) => {
          const { scenes: list, sceneIndex: index, stageSize: size } = latest.current;
          if (size.width === 0) return;

          // 左へ払う = 次のシーンへ進む
          const direction = gesture.dx < 0 ? 1 : -1;
          const target = list[index + direction];
          const moved = applyRubberBand(gesture.dx, Boolean(target));

          if (!target) {
            // 端。少しだけ動かして「これ以上先は無い」を指に返す
            setScrub(null);
            return;
          }
          setScrub({
            targetSceneId: target.id,
            progress: scrubProgress(moved, size.width),
          });
        },

        onPanResponderRelease: (_event, gesture) => {
          const { scenes: list, sceneIndex: index, stageSize: size } = latest.current;
          const direction = gesture.dx < 0 ? 1 : -1;
          const target = list[index + direction];

          const commit = shouldCommitScrub({
            deltaPx: gesture.dx,
            spanPx: size.width,
            elapsedMs: Date.now() - startedAt.current,
            hasTarget: Boolean(target),
          });

          if (commit && target) latest.current.selectScene(target.id);
          // 確定してもしなくても、指の進捗は畳む。確定した場合は
          // 選び直したシーンの位置へ、各ダンサーが自分で滑っていく
          setScrub(null);
        },

        onPanResponderTerminate: () => setScrub(null),
      }),
    [],
  );

  const targetPositions = scrub ? (positionsBySceneId[scrub.targetSceneId] ?? {}) : {};

  return (
    <View className="gap-2">
      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? '客席側' : 'バックステージ'}
      </Text>

      <View
        {...responder.panHandlers}
        onLayout={handleLayout}
        className="w-full overflow-hidden rounded-stage border border-line-strong bg-stage"
        style={{ aspectRatio: stageWidthUnits / stageHeightUnits }}
      >
        {gridMode === 'square' && (
          <GridLines widthUnits={stageWidthUnits} heightUnits={stageHeightUnits} />
        )}

        {/* 払っている間は、移動先にしか居ない人も描き始める。そうしないと
            半分まで引いた時点で「これから出てくる人」が居らず、確定した
            瞬間に唐突に現れる */}
        {Array.from(
          new Set([...Object.keys(positions), ...Object.keys(targetPositions)]),
        ).map((dancerId) => {
          const dancer = dancers[dancerId];
          if (!dancer) return null;

          const here = positions[dancerId];
          const there = targetPositions[dancerId];

          const point = scrub
            ? interpolateDancerPoint(
                here && { x: here.xCoordinate, y: here.yCoordinate },
                there && { x: there.xCoordinate, y: there.yCoordinate },
                scrub.progress,
              )
            : here && { x: here.xCoordinate, y: here.yCoordinate, opacity: 1 };
          if (!point) return null;

          // 客席を上にして描くときは、保存された座標は動かさず【描く向きだけ】
          // 上下を鏡にする(Web版 stageFlip.ts と同じ考え方)
          const screenY = isAudienceOnTop ? stageHeightUnits - point.y : point.y;

          return (
            <DraggableDancer
              key={dancerId}
              dancer={dancer}
              x={point.x}
              y={point.y}
              screenY={screenY}
              rotationAngle={here?.rotationAngle ?? 0}
              isSelected={dancerId === selectedDancerId}
              opacity={point.opacity}
              // 払っている最中は、その人だけを掴めないようにする
              // (指はステージ全体の操作に使われている)
              isDraggable={!scrub}
              stageWidthUnits={stageWidthUnits}
              stageHeightUnits={stageHeightUnits}
              stageSize={stageSize}
              isAudienceOnTop={isAudienceOnTop}
              isSnapEnabled={isSnapEnabled}
              showName={dancerNameDisplay === 'always'}
              transitionSeconds={transitionSeconds}
              isBlocked={blockedDancerIds.has(dancerId)}
              excessiveMove={excessiveMoves.get(dancerId) ?? null}
              // 押しただけなら選ぶ。もう一度押すと外れる
              onTap={() => selectDancer(dancerId === selectedDancerId ? null : dancerId)}
              onRotateEnd={(rotationAngle) =>
                commit(sceneId, dancerId, 'rotate', { rotationAngle })
              }
              onDragEnd={({ x, y }) =>
                // いまは端末の中だけ。Supabase への保存は、実機で1周
                // 確かめてから（account-panel.tsx 参照）
                commit(sceneId, dancerId, 'move', {
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
