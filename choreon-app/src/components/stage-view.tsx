import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, Text, type LayoutChangeEvent } from 'react-native';

import { DraggableDancer } from '@/components/draggable-dancer';
import { CurveHandle } from '@/components/curve-handle';
import { PathOverlay } from '@/components/path-overlay';
import { StageMarks } from '@/components/stage-marks';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { getSceneStep } from '@/features/canvas/lib/sceneStep';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';
import { useSceneWarnings } from '@/features/canvas/hooks/useSceneWarnings';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { upsertPositions } from '@/features/scene/api/positions';
import type { Position } from '@/features/scene/types';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useTourTarget } from '@/features/tutorial/lib/tourTargets';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { getT, useT } from '@/features/i18n/store/useLocaleStore';
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
  const t = useT();
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  // 使い方の案内が指す先。舞台の面そのもの（札ではなく）
  const stageRef = useTourTarget('stage');
  const previousSceneId = useUIStore((state) => state.previousSceneId);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const selectDancer = useUIStore((state) => state.selectDancer);
  const selectScene = useUIStore((state) => state.selectScene);
  const gridMode = useUIStore((state) => state.gridMode);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const isSwipeEnabled = useUIStore((state) => state.isSwipeSceneChangeEnabled);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const isSnapEnabled = useSettingsStore((state) => state.isSnapEnabled);
  const isBlindSpotCheckVisible = useUIStore((state) => state.isBlindSpotCheckVisible);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);
  const theme = useCurrentTheme();

  /**
   * 動かした結果をストアへ入れ、**戻せるように履歴へ積む**。
   *
   * 積むのは「操作前」と「操作後」の立ち位置まるごと（Web版
   * `usePositionCommit` と同じ形）。どのフィールドが変わった操作なのかを
   * 履歴側が知らなくてよくなる。
   */
  const commit = async (
    targetSceneId: string,
    dancerId: string,
    kind: 'move' | 'rotate' | 'curve',
    next: Partial<Position>,
  ) => {
    const before = positionsBySceneId[targetSceneId]?.[dancerId];
    if (!before) return;
    const after = { ...before, ...next };

    // 1. 先に画面へ反映（楽観的更新）
    updateDancerPosition(targetSceneId, dancerId, next);

    try {
      // 2. 保存。ゲスト中や仮のサンプルでは persist が何もせずに返る
      await persist((client) => upsertPositions(client, [after]));
      // 3. 保存できてから履歴へ積む（戻せるのは、保存された変更だけ）
      useHistoryStore.getState().push({
        kind,
        changes: [{ sceneId: targetSceneId, dancerId, before, after }],
      });
    } catch {
      // 4. 失敗したら元の位置へ戻す。**黙って飲まない** —
      //    動かしたのに保存されていない、がいちばん困る
      updateDancerPosition(targetSceneId, dancerId, before);
      useUIStore.getState().showToast({
        message: getT().positions.saveFailed,
        type: 'error',
        action: {
          label: getT().common.retry,
          onAction: () => void commit(targetSceneId, dancerId, kind, next),
        },
      });
    }
  };

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  /**
   * ステージを置ける枠の広さ。**寸法は自分で計算する。**
   *
   * `flex-1` と `aspectRatio` を組み合わせて「高さから幅を決める」形は
   * 当てにできない（ブラウザで測ったら 14:10 を渡しているのに 0.96 になった）。
   * 枠だけを flex で取り、その中に収まる最大の長方形を自分で出す。
   * これなら Web・iOS・Android で同じ寸法になる。
   */
  const [box, setBox] = useState({ width: 0, height: 0 });
  const ratio = stageWidthUnits / stageHeightUnits;
  // 上下の札（バックステージ／客席側）と、その間の隙間ぶん。
  // これを引いておかないと、札のぶんだけステージがはみ出す
  const LABEL_ALLOWANCE = 48;
  const fitWidth = Math.max(0, Math.min(box.width, (box.height - LABEL_ALLOWANCE) * ratio));
  const fitHeight = fitWidth / ratio;

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
  const { excessiveMoves, blockedDancerIds, collisions } = useSceneWarnings({
    positions,
    nextPositions: nextScene ? (positionsBySceneId[nextScene.id] ?? {}) : {},
    nextSceneSeconds: durations[sceneIndex + 1] ?? 0,
    isBlindSpotCheckVisible,
    // ぶつかる印は導線と一緒のときだけ。線が見えていないと直しようがない
    isPathVisible,
    nextSceneId: nextScene?.id ?? null,
  });

  /**
   * 導線の曲がり具合（制御点）を保存する。
   *
   * 立ち位置と同じ `commit` を通す — 制御点は **positions の列**に入って
   * いるので、保存も履歴も同じ道でよい。`kind` を分けているのは、
   * 「元に戻す」で何が戻るのかを後から読めるようにするため。
   *
   * **書き込む先は「次のシーン」の行。** 区間の持ち物は後ろ側のシーンが
   * 持っている（秒数と同じ置き方）。
   */
  const commitCurve = (dancerId: string, control: { x: number; y: number } | null) => {
    if (!nextScene) return;
    void commit(nextScene.id, dancerId, 'curve', {
      curveControlX: control?.x ?? null,
      curveControlY: control?.y ?? null,
    });
  };

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
    /**
     * ■ 高さに合わせて縮む
     * 以前は幅いっぱい（`w-full`）に広げて、高さは形から決まるままだった。
     * 画面全体が縦にスクロールしていたので、はみ出しても下へ伸びるだけで
     * 済んでいた。**画面の高さに収める骨格に変えたので、余った高さの中へ
     * 収まってもらう必要がある。**
     */
    /* 枠。ここが余った高さを受け取り、中のステージは自分で寸法を決める。
       札はステージと一緒に中央へ寄る（離して置くと、どちらの縁の札なのか
       読み取れなくなる） */
    <View
      className="min-h-0 flex-1 items-center justify-center gap-2"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
    >
      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? t.stage.audience : t.stage.backstage}
      </Text>

      <View
        ref={stageRef}
        {...responder.panHandlers}
        onLayout={handleLayout}
        className="overflow-hidden rounded-stage border border-line-strong bg-stage"
        style={{ width: fitWidth, height: fitHeight }}
      >
        {gridMode === 'square' && (
          <GridLines widthUnits={stageWidthUnits} heightUnits={stageHeightUnits} />
        )}

        {/* 吸い付く先。格子を消していても出す — 吸着は格子の表示とは別の
            設定で、切っていない限り効いているため */}
        <SnapLines widthUnits={stageWidthUnits} heightUnits={stageHeightUnits} />

        {isStageMarksVisible && (
          <StageMarks
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
          />
        )}

        {/* 導線はダンサーより下に描く。線の上に丸が乗る方が、
            誰の線かを追いやすい */}
        {isPathVisible && nextScene && !scrub && (
          <PathOverlay
            currentPositions={positions}
            nextPositions={positionsBySceneId[nextScene.id] ?? {}}
            dancers={dancers}
            stageWidthUnits={stageWidthUnits}
            stageHeightUnits={stageHeightUnits}
          />
        )}

        {/* 導線を曲げるつまみ。**選んでいる人の線にだけ**出す。
            全員ぶん出すと、ダンサー本体と見分けが付かなくなる */}
        {isPathVisible && nextScene && !scrub && selectedDancerId
          ? (() => {
              const from = positions[selectedDancerId];
              const to = (positionsBySceneId[nextScene.id] ?? {})[selectedDancerId];
              // 動かない人には線が無いので、曲げるつまみも出さない
              if (!from || !to) return null;
              if (
                from.xCoordinate === to.xCoordinate &&
                from.yCoordinate === to.yCoordinate
              ) {
                return null;
              }
              const hasCurve = to.curveControlX != null && to.curveControlY != null;
              return (
                <CurveHandle
                  x={hasCurve ? (to.curveControlX as number) : (from.xCoordinate + to.xCoordinate) / 2}
                  y={hasCurve ? (to.curveControlY as number) : (from.yCoordinate + to.yCoordinate) / 2}
                  color={themedDancerColor(dancers[selectedDancerId]?.color ?? '', theme)}
                  stageWidthUnits={stageWidthUnits}
                  stageHeightUnits={stageHeightUnits}
                  stageSize={stageSize}
                  isAudienceOnTop={isAudienceOnTop}
                  onMoveEnd={(next) => commitCurve(selectedDancerId, next)}
                  onReset={() => commitCurve(selectedDancerId, null)}
                />
              );
            })()
          : null}

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
              // 誰かに「注目」しているときは、その人以外を薄くする。
              // 払っている最中の濃さと掛け合わせる（両方が効く場面がある）
              opacity={
                point.opacity * (focusedDancerId && focusedDancerId !== dancerId ? 0.25 : 1)
              }
              // 払っている最中は、その人だけを掴めないようにする
              // (指はステージ全体の操作に使われている)
              isDraggable={!scrub}
              stageWidthUnits={stageWidthUnits}
              stageHeightUnits={stageHeightUnits}
              stageSize={stageSize}
              isAudienceOnTop={isAudienceOnTop}
              isSnapEnabled={isSnapEnabled}
              // 「選択時」は選んでいる人だけ。設定に3つ目の選択肢を出した
              // 以上、ここが 'always' しか見ないと押しても何も起きない
              showName={
                dancerNameDisplay === 'always' ||
                (dancerNameDisplay === 'selected' && dancerId === selectedDancerId)
              }
              // この人だけ短く動く設定があれば、そちらが勝つ（区間より
              // 短い＝早く着いて残りは立って待つ、という意味）。
              // 区間そのものが 0（隣り合わないシーンへ飛んだ）ときは
              // 上書きも効かせない — 通っていない区間を通ったように見せない
              transitionSeconds={
                transitionSeconds === 0
                  ? 0
                  : Math.min(
                      transitionSeconds,
                      here?.dancerTransitionDurationSeconds ?? transitionSeconds,
                    )
              }
              isBlocked={blockedDancerIds.has(dancerId)}
              excessiveMove={excessiveMoves.get(dancerId) ?? null}
              collision={collisions.get(dancerId) ?? null}
              // 押しただけなら選ぶ。もう一度押すと外れる
              onTap={() => selectDancer(dancerId === selectedDancerId ? null : dancerId)}
              onRotateEnd={(rotationAngle) =>
                void commit(sceneId, dancerId, 'rotate', { rotationAngle })
              }
              onDragEnd={({ x, y }) =>
                // いまは端末の中だけ。Supabase への保存は、実機で1周
                // 確かめてから（account-panel.tsx 参照）
                void commit(sceneId, dancerId, 'move', {
                  xCoordinate: x,
                  yCoordinate: y,
                })
              }
            />
          );
        })}
      </View>

      <Text className="text-center text-xs uppercase tracking-widest text-fg-muted">
        {isAudienceOnTop ? t.stage.backstage : t.stage.audience}
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
/**
 * 吸い付く先の格子線。掴んでいる間だけ、その1本（か2本）を光らせる。
 *
 * ■ なぜ光らせるのか
 * 吸着はドラッグの最中には見えない — 離してはじめて位置が動く。しかも
 * **指の下は指で隠れている**ので、どこへ着くのかが離すまで分からない。
 * 縦横どちらも出ていれば、交差点へ吸うのだと分かる。
 *
 * ■ 影は付けない
 * Web版は光の滲みを `box-shadow` で足しているが、RN の `shadow*` は
 * iOS と Android で出方が違う（Android は elevation で、色も付かない）。
 * **太さと色だけ**で見せる（1px の格子に対して 2px・アクセント色）。
 */
function SnapLines({
  widthUnits,
  heightUnits,
}: {
  widthUnits: number;
  heightUnits: number;
}) {
  const line = useUIStore((state) => state.dragSnapLine);
  if (line.x === null && line.y === null) return null;

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {line.x !== null ? (
        <View
          testID="snap-line-x"
          className="absolute top-0 bottom-0 w-0.5 bg-accent-soft"
          style={{ left: `${(line.x / widthUnits) * 100}%`, marginLeft: -1 }}
        />
      ) : null}
      {line.y !== null ? (
        <View
          testID="snap-line-y"
          className="absolute right-0 left-0 h-0.5 bg-accent-soft"
          style={{ top: `${(line.y / heightUnits) * 100}%`, marginTop: -1 }}
        />
      ) : null}
    </View>
  );
}

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
