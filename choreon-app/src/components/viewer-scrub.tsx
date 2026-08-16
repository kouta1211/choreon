import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { rulerTicks } from '@/features/viewer/lib/rulerTicks';
import { sceneSpanAt } from '@/features/viewer/lib/interpolate';

/** 見るだけなので、エディタより引き気味で十分（Web版と同じ） */
const PX_PER_SECOND = 24;
/** 帯の高さ。エディタの帯（80px）より低い */
const BAND_HEIGHT = 56;
const RULER_HEIGHT = 16;
/** コマの幅。時刻の位置に**中心**を合わせて置く */
const CARD_WIDTH = 28;
const SELECTED_CARD_WIDTH = 34;
/** 最後のシーンのあとにも少し余白を作る（最後で止まりきらないと詰まって見える） */
const TAIL_SECONDS = 2;

type Props = {
  /** いま濃く出している人。コマの中の点をその人だけ強く出す */
  focusedDancerId: string | null;
  /** ステージの広さ。コマの中のミニチュアを、実際の比で置くのに要る */
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * ビューアのスクラブ帯。**この画面の主操作**。
 *
 * ■ なぜ要ったか
 * これまでビューアはエディタのシーンの帯を読むだけにして使っていた。
 * 押せば切り替わるが、**移動の途中で止められない**。稽古場で知りたいのは
 * 「サビのここで自分はどこ」で、それは区間の途中にある。止められないと、
 * 手前と先の隊形を見比べて頭の中で補うことになる。
 *
 * ■ 再生ヘッドは真ん中に固定
 * 帯の方が動く。エディタは 43% の位置だが、あちらは「先を見ながら組む」
 * 道具で、こちらは「止めて見る」道具。中央に置くと、指で送っても戻しても
 * 同じ手応えになる。
 *
 * ■ ScrollView に運ばせる
 * 自前の PanResponder で書くと、指を離したあとの流れ（慣性）と端の
 * 跳ね返りを全部自分で作ることになる。**時間軸を横に流すのは
 * ScrollView がやっていることそのもの**なので、頭に窓の半分ぶんの余白を
 * 置いて「0秒が中央に来る」形にする。
 *
 * ■ 秒はどこが持つか
 * `usePlaybackStore.currentTime`。再生も同じ場所へ書くので、
 * **指で動かしている間だけこちらが正**になるよう、掴んでいるかを見ている
 * （両方が書くと、指と再生で引っぱり合う）。
 */
export function ViewerScrub({ focusedDancerId, stageWidthUnits, stageHeightUnits }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const isPlaying = useUIStore((state) => state.isPlaying);

  const scroller = useRef<ScrollView>(null);
  /** 指で掴んでいる間は、外から位置を書き戻さない */
  const isDragging = useRef(false);
  const [viewport, setViewport] = useState(0);

  const total =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds + TAIL_SECONDS : TAIL_SECONDS;
  /** 0秒を中央へ持ってくるための、頭とお尻の余白 */
  const lead = viewport / 2;
  const contentWidth = lead * 2 + total * PX_PER_SECOND;

  // 再生中や、コマを押して飛んだときに帯を追従させる。
  // 掴んでいる間は書き戻さない（指と引っぱり合う）
  useEffect(() => {
    if (isDragging.current || viewport === 0) return;
    scroller.current?.scrollTo({ x: currentTime * PX_PER_SECOND, animated: !isPlaying });
  }, [currentTime, viewport, isPlaying]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDragging.current) return;
    const seconds = Math.max(0, event.nativeEvent.contentOffset.x / PX_PER_SECOND);
    setCurrentTime(seconds);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewport(event.nativeEvent.layout.width);
  };

  const span = sceneSpanAt(scenes, currentTime);
  const ticks = viewport > 0 ? rulerTicks(currentTime * PX_PER_SECOND, viewport, PX_PER_SECOND, lead) : [];

  return (
    <View className="gap-1 rounded-2xl border border-line bg-surface p-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-xs uppercase tracking-widest text-fg-muted">
          {t.viewer.scrub.section}
        </Text>
        <Text className="font-mono text-[11px] text-fg-sub">
          {t.viewer.scrub.clock(currentTime.toFixed(1), span?.from.name ?? '')}
        </Text>
      </View>

      <View onLayout={handleLayout} style={{ height: BAND_HEIGHT + RULER_HEIGHT }}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            isDragging.current = true;
            // 指で触ったら再生は止める（見たい場所を探しているので）
            if (useUIStore.getState().isPlaying) useUIStore.getState().setIsPlaying(false);
          }}
          onScrollEndDrag={() => {
            // 慣性が残るので、止まりきるまでは指の側を正のままにする
          }}
          onMomentumScrollEnd={() => {
            isDragging.current = false;
          }}
          contentContainerStyle={{ width: contentWidth }}
        >
          {/* 目盛り。刻みは幅から決まる（文字が重ならない最小） */}
          {ticks.map((seconds) => (
            <View
              key={seconds}
              pointerEvents="none"
              style={{ position: 'absolute', left: lead + seconds * PX_PER_SECOND, top: 0 }}
            >
              <View className="h-2 w-px bg-line-strong" />
              <Text className="absolute top-2 left-1 font-mono text-[9px] text-fg-muted">
                {t.viewer.scrub.tick(seconds)}
              </Text>
            </View>
          ))}

          {scenes.map((scene, index) => {
            const isHere = span?.from.id === scene.id;
            const width = isHere ? SELECTED_CARD_WIDTH : CARD_WIDTH;
            const positions = positionsBySceneId[scene.id] ?? {};
            return (
              <Pressable
                key={scene.id}
                onPress={() => setCurrentTime(scene.timeSeconds)}
                accessibilityRole="button"
                accessibilityLabel={scene.name}
                accessibilityState={{ selected: isHere }}
                style={{
                  position: 'absolute',
                  left: lead + scene.timeSeconds * PX_PER_SECOND - width / 2,
                  top: RULER_HEIGHT,
                  width,
                  height: BAND_HEIGHT - 4,
                }}
                className={`items-center justify-center rounded-lg border active:opacity-70 ${
                  isHere ? 'border-accent bg-accent-row' : 'border-line bg-surface-raised'
                }`}
              >
                {/* 中の点は隊形のミニチュア。**この帯でいちばん要るのは
                    「いま誰がどのあたりか」**なので、番号より形を出す */}
                <View className="h-6 w-6">
                  {Object.entries(positions).map(([dancerId, position]) => (
                    <View
                      key={dancerId}
                      className={`absolute h-1 w-1 rounded-full ${
                        focusedDancerId === dancerId ? 'bg-accent' : 'bg-fg-muted'
                      }`}
                      style={{
                        left: `${(position.xCoordinate / stageWidthUnits) * 100}%`,
                        top: `${(position.yCoordinate / stageHeightUnits) * 100}%`,
                      }}
                    />
                  ))}
                </View>
                <Text className="font-mono text-[9px] text-fg-muted">
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 再生ヘッド。**帯ではなく窓の中央に固定**。押しても何も起きない
            ので、指は帯へ通す */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: viewport / 2 - 1, top: 0, bottom: 0 }}
          className="w-0.5 bg-accent"
        />
      </View>

      <Text className="px-1 text-[10px] leading-4 text-fg-muted">
        {t.viewer.scrub.note}
      </Text>
    </View>
  );
}
