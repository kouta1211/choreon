import { useMemo, useRef } from 'react';
import { Animated, PanResponder, View } from 'react-native';

import { clamp } from '@/features/canvas/lib/dragMath';
import { toScreenY } from '@/features/canvas/lib/stageFlip';

type Props = {
  /** 制御点（ステージ座標）。曲げていなければ両端の中点が入る */
  x: number;
  y: number;
  color: string;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** ステージの実寸(px)。px の移動量をユニットへ直すのに要る */
  stageSize: { width: number; height: number };
  isAudienceOnTop: boolean;
  /** 指を離したとき。ステージ座標で返す */
  onMoveEnd: (next: { x: number; y: number }) => void;
  /** 長押しで真っ直ぐに戻す */
  onReset: () => void;
};

/** つまみの直径(px)。指で掴める大きさ（ダンサーの丸より小さく） */
const KNOB = 20;

/**
 * 導線を曲げるつまみ。**選んでいる人の線にだけ出す。**
 *
 * ■ なぜ選んだ人だけなのか
 * 全員ぶん出すと、人数ぶんのつまみがステージに散らばって、ダンサー本体と
 * 見分けが付かなくなる（掴んだつもりが線を曲げていた、が起きる）。
 * 曲げたい線を選んでから触る、という順にした。
 *
 * ■ 動かし方はダンサーと同じ
 * `PanResponder` ＋ `Animated.ValueXY`。**掴んだ時点で dx が 0 に戻る**ので、
 * 判定に使った移動量を控えて足し戻す（`draggable-dancer.tsx` と同じ話）。
 * 格子への吸着はしない — 曲線の膨らみを格子に合わせる意味が無く、
 * 吸い付くと微調整ができなくなる。
 *
 * ■ 長押しで真っ直ぐへ
 * 曲げたものを戻す手段が要る。制御点を両端の中点へ「だいたい」戻すのは
 * 手では難しいので、押し続けたら消す（`curveControl` を null にする）。
 */
export function CurveHandle({
  x,
  y,
  color,
  stageWidthUnits,
  stageHeightUnits,
  stageSize,
  isAudienceOnTop,
  onMoveEnd,
  onReset,
}: Props) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // PanResponder は一度しか作らないので、最新の値は ref から読む
  const latest = useRef({ x, y, stageSize, isAudienceOnTop, onMoveEnd, onReset });
  latest.current = { x, y, stageSize, isAudienceOnTop, onMoveEnd, onReset };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),

        onPanResponderRelease: (_event, gesture) => {
          const { x: baseX, y: baseY, stageSize: size, isAudienceOnTop: flipped } =
            latest.current;
          pan.setValue({ x: 0, y: 0 });

          if (size.width === 0 || size.height === 0) return;

          // 長押し（ほとんど動かさずに離した）なら真っ直ぐへ戻す
          if (Math.abs(gesture.dx) < 4 && Math.abs(gesture.dy) < 4) {
            latest.current.onReset();
            return;
          }

          const unitsX = (gesture.dx / size.width) * stageWidthUnits;
          // 客席を上にしているときは、画面の下がステージの奥。動かす向きも鏡
          const unitsY =
            ((gesture.dy / size.height) * stageHeightUnits) * (flipped ? -1 : 1);

          // ステージの外へは出さない。制御点が外にあると、線が画面の外を
          // 通って「どこへ動くのか」が読めなくなる
          latest.current.onMoveEnd({
            x: clamp(baseX + unitsX, 0, stageWidthUnits),
            y: clamp(baseY + unitsY, 0, stageHeightUnits),
          });
        },

        onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
      }),
    [pan, stageWidthUnits, stageHeightUnits],
  );

  const screenY = toScreenY(y, stageHeightUnits, isAudienceOnTop);

  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="adjustable"
      style={{
        position: 'absolute',
        left: `${(x / stageWidthUnits) * 100}%`,
        top: `${(screenY / stageHeightUnits) * 100}%`,
        // つまみの中心を制御点に合わせる
        marginLeft: -KNOB / 2,
        marginTop: -KNOB / 2,
        width: KNOB,
        height: KNOB,
        transform: pan.getTranslateTransform(),
      }}
    >
      {/* 中は空の輪。**塗り潰すとダンサーの丸に見える** */}
      <View
        style={{ borderColor: color, borderWidth: 2, backgroundColor: 'transparent' }}
        className="h-full w-full rounded-full"
      />
    </Animated.View>
  );
}
