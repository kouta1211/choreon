import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SceneThumbnail } from '@/components/scene-thumbnail';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useTourTarget } from '@/features/tutorial/lib/tourTargets';
import { getT, useT } from '@/features/i18n/store/useLocaleStore';
import {
  TIMELINE_LAYOUT,
  cardMinGapPx,
  screenKindFor,
} from '@/features/music/lib/timelineLayout';
import {
  DEFAULT_PX_PER_SECOND,
  LEAD_IN_PX,
  axisX,
  degradeScenes,
} from '@/features/music/lib/timelineScale';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { updateSceneTimes } from '@/features/scene/api/scenes';
import type { Scene } from '@/features/scene/types';
import { moveSceneTo } from '@/features/scene/lib/sceneTiming';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** 帯の高さ。コマ＋目盛りのぶん */
const TRACK_HEIGHT = 96;

/**
 * 時間軸。**シーンを「曲の何秒目か」の位置に並べる帯。**
 *
 * ■ シーンの帯（SceneDock）との違い
 * あちらは等間隔に並べる「行き来するための帯」。こちらは**時刻そのものが
 * 位置**なので、「ここは詰まっている」「ここは間が空いている」が目で分かる。
 * 曲を入れて振付を組むときは、こちらの方が要る。
 *
 * ■ 波形は出さない
 * Web版は曲の波形を背景に描いて、それを見ながらシーンを置ける。
 * **`expo-audio` は音の中身（PCM）を返さない**ので、ネイティブでは波形を
 * 作れない（デコードする手段が無い）。ここは曲の長さと時刻の目盛りだけで
 * 組む。波形が要るなら、音を解析できる別の仕組みを入れることになる。
 *
 * ■ コマを横に引くと時刻が変わる
 * 計算は Web版の `moveSceneTo` をそのまま使う（**ちょうど同じ時刻に
 * 重ねようとしたときだけ、最小の間隔ぶんずらす**）。
 *
 * ■ 詰まったところは「旗」に落とす
 * 近すぎるコマを全部描くと重なって読めない。`degradeScenes` が
 * 「コマ／旗／束ね」を決める（Web版と同じ関数・同じ閾値）。
 */
export function MusicTimeline({ stageWidthUnits, stageHeightUnits }: Props) {
  const t = useT();
  const accent = useThemeColor('--accent');
  const line = useThemeColor('--line-strong');
  const { width } = useWindowDimensions();
  const layout = TIMELINE_LAYOUT[screenKindFor(width)];

  const scenes = useProjectStore((state) => state.scenes);
  const applySceneTimes = useProjectStore((state) => state.applySceneTimes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  // 使い方の案内が指す先。曲が無いときは SceneDock が同じ名前を名乗る
  const timelineRef = useTourTarget('timeline');
  const selectScene = useUIStore((state) => state.selectScene);
  const showToast = useUIStore((state) => state.showToast);
  const currentTime = usePlaybackStore((state) => state.currentTime);

  /**
   * コマを掴んでいる間か。**掴んでいる間は帯のスクロールを止める。**
   *
   * 止めないと、外側の横スクロールが指を途中で奪う。実際に、右へ48px
   * 引いたときは 2.0 秒動いたのに、左へ48px 引いたときは 0.8 秒しか
   * 動かなかった（残りはスクロールに 食われていた）。
   */
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const pxPerSecond = DEFAULT_PX_PER_SECOND;
  const items = degradeScenes(
    scenes.map((scene) => scene.timeSeconds),
    pxPerSecond,
    cardMinGapPx(layout),
  );

  const lastSeconds = scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;
  // 最後のシーンの先にも少し余白を置く。端にぴったりだと、そこが
  // 終わりなのか切れているのか分からない
  const contentWidth = axisX(lastSeconds, pxPerSecond) + layout.selectedCardWidth;

  /* 見取り図に「いま窓がどこか」を出すのに、幅と位置が要る */
  const scroller = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewportPx, setViewportPx] = useState(0);

  /** 時刻を保存する。**動いた1つだけ**を送る */
  const commitTime = async (index: number, seconds: number) => {
    const timesById = moveSceneTo(scenes, index, seconds);
    const changed = scenes
      .filter((scene) => {
        const value = timesById.get(scene.id);
        return value !== undefined && value !== scene.timeSeconds;
      })
      .map((scene) => ({ id: scene.id, timeSeconds: timesById.get(scene.id)! }));
    if (changed.length === 0) return;

    const previous = new Map(scenes.map((scene) => [scene.id, scene.timeSeconds]));
    applySceneTimes(timesById);
    try {
      await persist((client) => updateSceneTimes(client, changed));
    } catch {
      applySceneTimes(previous);
      showToast({ message: t.scenes.retimeFailed, type: 'error' });
    }
  };

  if (scenes.length === 0) return null;

  return (
    <View ref={timelineRef} className="gap-1 rounded-2xl border border-line bg-surface p-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs uppercase tracking-widest text-fg-muted">
          {t.timeline.section}
        </Text>
        <Text className="font-mono text-[10px] text-fg-muted">
          {t.timeline.scale(pxPerSecond)}
        </Text>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isDraggingCard}
        scrollEventThrottle={32}
        onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
        onLayout={(event) => setViewportPx(event.nativeEvent.layout.width)}
        contentContainerStyle={{ width: contentWidth, height: TRACK_HEIGHT }}
      >
        {/* 秒の目盛り。5秒ごとに線と数字 */}
        <Ticks seconds={lastSeconds} pxPerSecond={pxPerSecond} color={line} />

        {/* いま鳴っている位置 */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: axisX(currentTime, pxPerSecond),
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: accent,
          }}
        />

        {items.map((item) => {
          const index = item.indexes[0];
          const scene = scenes[index];
          if (!scene) return null;
          const isSelected = scene.id === selectedSceneId;

          if (item.kind === 'card') {
            return (
              <TimelineCard
                key={scene.id}
                x={axisX(scene.timeSeconds, pxPerSecond)}
                width={isSelected ? layout.selectedCardWidth : layout.cardWidth}
                sceneId={scene.id}
                name={scene.name}
                seconds={scene.timeSeconds}
                index={index}
                isSelected={isSelected}
                stageWidthUnits={stageWidthUnits}
                stageHeightUnits={stageHeightUnits}
                pxPerSecond={pxPerSecond}
                onPress={() => selectScene(scene.id)}
                onMoveEnd={(seconds) => void commitTime(index, seconds)}
                onDragStateChange={setIsDraggingCard}
              />
            );
          }

          // 詰まっているところ。番号だけの旗、さらに詰まっていれば束ねた数
          const label =
            item.kind === 'flag'
              ? String(index + 1).padStart(2, '0')
              : `+${item.indexes.length}`;
          return (
            <Pressable
              key={scene.id}
              onPress={() => selectScene(scene.id)}
              accessibilityRole="button"
              accessibilityLabel={scene.name}
              style={{
                position: 'absolute',
                left: axisX(scene.timeSeconds, pxPerSecond) - 10,
                bottom: 18,
              }}
              className={`h-5 min-w-5 items-center justify-center rounded px-1 ${
                isSelected ? 'bg-accent' : 'bg-surface-strong'
              }`}
            >
              <Text
                className={`font-mono text-[9px] ${
                  isSelected ? 'text-accent-fg' : 'text-fg-muted'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 曲ぜんたいの見取り図。長い曲だと、帯の窓に入るのは一部だけなので */}
      <Minimap
        scenes={scenes}
        lastSeconds={lastSeconds}
        currentTime={currentTime}
        viewportPx={viewportPx}
        contentWidth={contentWidth}
        scrollX={scrollX}
        onJump={(ratio) => {
          const target = ratio * contentWidth - viewportPx / 2;
          scroller.current?.scrollTo({ x: Math.max(0, target), animated: true });
        }}
      />

      <Text className="px-1 text-[10px] leading-4 text-fg-muted">{t.timeline.note}</Text>
    </View>
  );
}

/** 5秒ごとの目盛り。曲の長さぶん引く */
function Ticks({
  seconds,
  pxPerSecond,
  color,
}: {
  seconds: number;
  pxPerSecond: number;
  color: string;
}) {
  const marks = useMemo(() => {
    const list: number[] = [];
    for (let s = 0; s <= seconds + 5; s += 5) list.push(s);
    return list;
  }, [seconds]);

  return (
    <>
      {marks.map((s) => (
        <View
          key={s}
          pointerEvents="none"
          style={{ position: 'absolute', left: axisX(s, pxPerSecond), top: 0, bottom: 16 }}
        >
          <View style={{ width: 1, flex: 1, backgroundColor: color, opacity: 0.5 }} />
          <Text className="absolute bottom-[-14px] left-1 font-mono text-[9px] text-fg-muted">
            {s}s
          </Text>
        </View>
      ))}
    </>
  );
}

/**
 * 1コマ。横に引くと時刻が変わる。
 *
 * 引いている間は見た目だけを動かし、離した時に1回だけ確定する
 * （ダンサーの丸と同じ考え方。途中でストアを書くと帯全体が描き直される）。
 */
function TimelineCard({
  x,
  width,
  sceneId,
  name,
  seconds,
  index,
  isSelected,
  stageWidthUnits,
  stageHeightUnits,
  pxPerSecond,
  onPress,
  onMoveEnd,
  onDragStateChange,
}: {
  x: number;
  width: number;
  sceneId: string;
  name: string;
  seconds: number;
  index: number;
  isSelected: boolean;
  stageWidthUnits: number;
  stageHeightUnits: number;
  pxPerSecond: number;
  onPress: () => void;
  onMoveEnd: (seconds: number) => void;
  /** 掴んでいる間を親へ伝える。親は帯のスクロールを止める */
  onDragStateChange: (isDragging: boolean) => void;
}) {
  const pan = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

  const latest = useRef({ seconds, onMoveEnd, onPress, onDragStateChange });
  latest.current = { seconds, onMoveEnd, onPress, onDragStateChange };

  const setDragging = (value: boolean) => {
    setIsDragging(value);
    latest.current.onDragStateChange(value);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        /**
         * **横に引いたら、外側のスクロールより先に取る（capture）。**
         *
         * 普通の（capture でない）判定だと、指の最初の数十pxを横スクロールに
         * 持っていかれる。`scrollEnabled` を切る手も試したが、React の
         * 描き直しを待つあいだに数フレーム進んでしまい、実測で 48px 引いて
         * 1.4 秒ぶんしか動かなかった。**先に取れば取り合いが起きない。**
         *
         * 住み分けはステージと同じ考え方 —
         * コマの上から始まった指はコマを動かし、
         * 何も無いところから始まった指は帯をスクロールする。
         */
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),

        onPanResponderGrant: () => setDragging(true),

        // **`dx` ではなく、押した位置からの絶対座標の差で測る。**
        // `dx` は責任者になった時点で 0 に戻されることがあり、実測で
        // 48px 引いても 1.6 秒ぶん（＝38px）しか動かなかった。
        // `x0`（押した位置）と `moveX`（いまの位置）の差なら取りこぼさない
        onPanResponderMove: (_event, gesture) => {
          pan.setValue(gesture.moveX - gesture.x0);
        },

        onPanResponderRelease: (_event, gesture) => {
          setDragging(false);
          pan.setValue(0);
          const moved = gesture.moveX - gesture.x0;
          // ほとんど動かさずに離したのは「選ぶ」
          if (Math.abs(moved) < 6) {
            latest.current.onPress();
            return;
          }
          latest.current.onMoveEnd(
            Math.max(0, latest.current.seconds + moved / pxPerSecond),
          );
        },

        onPanResponderTerminate: () => {
          setDragging(false);
          pan.setValue(0);
        },
      }),
    [pan, pxPerSecond],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: isSelected }}
      style={{
        position: 'absolute',
        // コマの中心を時刻に合わせる
        left: x - width / 2,
        top: 4,
        width,
        transform: [{ translateX: pan }],
        zIndex: isDragging || isSelected ? 2 : 1,
      }}
      className={`gap-0.5 rounded-lg p-1 ${
        isSelected ? 'border-2 border-accent bg-accent-row' : 'border border-line bg-surface-raised'
      }`}
    >
      <SceneThumbnail
        sceneId={sceneId}
        stageWidthUnits={stageWidthUnits}
        stageHeightUnits={stageHeightUnits}
        widthPx={width - 8}
      />
      <Text numberOfLines={1} className="text-[9px] text-fg-sub">
        {name}
      </Text>
      <Text className="font-mono text-[9px] text-fg-muted">
        {String(index + 1).padStart(2, '0')} · {seconds.toFixed(1)}s
      </Text>
    </Animated.View>
  );
}

/** ミニマップの高さ。倍率が変わっても段が上下しないよう固定 */
const MINIMAP_HEIGHT = 14;

/**
 * 時間軸の見取り図。**曲ぜんたいを1行に押し込んで、いま窓がどこかを出す。**
 *
 * ■ なぜ要るか
 * 帯は寄って描いてあるので、長い曲だと窓に入るのは一部だけ。横に流している
 * うちに「いま曲のどのあたりを見ているのか」が分からなくなる。シーンの点も
 * 置くので、**混んでいる所と空いている所**が一目で分かる。
 *
 * ■ 押せる
 * 見るだけの帯にすると、遠くへ行くのに何度も払うことになる。押した所へ
 * 窓を飛ばす。
 */
function Minimap({
  scenes,
  lastSeconds,
  currentTime,
  viewportPx,
  contentWidth,
  scrollX,
  onJump,
}: {
  scenes: Scene[];
  lastSeconds: number;
  currentTime: number;
  viewportPx: number;
  contentWidth: number;
  scrollX: number;
  onJump: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(0);
  // 窓がぜんたいのどこを、どれだけ占めているか
  const windowRatio = contentWidth > 0 ? Math.min(1, viewportPx / contentWidth) : 1;
  const windowLeft = contentWidth > 0 ? scrollX / contentWidth : 0;

  // ぜんたいが窓に収まっているなら、見取り図に意味が無い
  if (viewportPx > 0 && contentWidth <= viewportPx) return null;

  return (
    <Pressable
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onPress={(event) => {
        if (width <= 0) return;
        onJump(event.nativeEvent.locationX / width);
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={getT().timeline.minimap}
      style={{ height: MINIMAP_HEIGHT }}
      className="justify-center overflow-hidden rounded bg-surface-raised"
    >
      {/* シーンの点 */}
      {scenes.map((scene) => (
        <View
          key={scene.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${lastSeconds > 0 ? (scene.timeSeconds / lastSeconds) * 100 : 0}%`,
            width: 2,
            top: 3,
            bottom: 3,
          }}
          className="rounded-full bg-fg-muted"
        />
      ))}

      {/* いま鳴っている位置 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${lastSeconds > 0 ? Math.min(100, (currentTime / lastSeconds) * 100) : 0}%`,
          width: 1,
          top: 0,
          bottom: 0,
        }}
        className="bg-accent"
      />

      {/* いま見えている窓 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${windowLeft * 100}%`,
          width: `${windowRatio * 100}%`,
          top: 0,
          bottom: 0,
        }}
        className="rounded border border-accent bg-accent-row"
      />
    </Pressable>
  );
}
