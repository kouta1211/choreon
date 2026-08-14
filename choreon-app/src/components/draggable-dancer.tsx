import { useMemo, useRef } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';

import {
  clamp,
  pixelDeltaToUnitDelta,
  snapToGrid,
} from '@/features/canvas/lib/dragMath';
import type { Dancer } from '@/features/dancer/types';

/**
 * 格子への吸着が効き始める許容範囲（ステージ座標系のユニット）。
 * Web版は gridSnapModifier.ts が持っているが、あれは dnd-kit の modifier
 * なので持ってこられない。**値と理由だけを写す**: 1ユニットの1割程度、
 * 線のごく近くまで来て初めて効く狭さ（広すぎると、まだ線から離れているのに
 * 吸着して狙った位置に置けなくなる）。
 */
const GRID_SNAP_TOLERANCE = 0.1;

/** これ未満の移動はタップ。Web版の dnd-kit の activationConstraint と同じ 8px */
const DRAG_THRESHOLD_PX = 8;

type Props = {
  dancer: Dancer;
  /** ステージ座標系での位置 */
  x: number;
  y: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** ステージの実寸(px)。px の移動量をユニットへ直すのに要る */
  stageSize: { width: number; height: number };
  /** 画面の向きに写した Y（客席を上にしているときは鏡） */
  screenY: number;
  isAudienceOnTop: boolean;
  isSnapEnabled: boolean;
  showName: boolean;
  /** 指を離した時に1回だけ呼ばれる。保存はここではなく呼び出し側 */
  onDragEnd: (next: { x: number; y: number }) => void;
};

const DOT = 28;

/**
 * 掴んで動かせるダンサー。
 *
 * ■ 引いている間と、離した時で役割を分ける
 * Web版(dnd-kit)と同じ考え方: 引いている間は**見た目だけ**を動かし
 * (Animated.ValueXY)、離した時に1回だけステージ座標へ直して確定する。
 * 途中でストアを書き換えると、指を動かすたびにキャンバス全体が描き直される。
 *
 * ■ なぜ PanResponder なのか（Gesture Handler ではなく）
 * 初めは react-native-gesture-handler + Reanimated で書いたが、**Web で
 * `setPointerCapture` の例外を投げて掴めなかった**（3つの出力先のうち Web が
 * 落ちるのは許容できない）。PanResponder は React Native 標準の仕組みで、
 * react-native-web も同じ責任者(responder)の仕組みを実装しているため、
 * Web・iOS・Android の3つで同じコードが動く。
 *
 * 指の追従は JS 側で処理するので、Reanimated のように別スレッドでは動かない。
 * ダンサーは十数人までなので実用上は足りるが、**実機で重いと感じたら
 * Reanimated へ移すのが次の一手**（そのときは Web だけ別実装にする）。
 *
 * ■ 計算は Web版と同じものを使う
 * px→ユニットの変換・縁での止め方・格子への吸着は `dragMath.ts` を
 * **1文字も変えずにコピー**して呼んでいる。ここが環境で変わると、
 * 同じ作品を Web とスマホで開いたときに置ける場所がずれる。
 */
export function DraggableDancer({
  dancer,
  x,
  y,
  stageWidthUnits,
  stageHeightUnits,
  stageSize,
  screenY,
  isAudienceOnTop,
  isSnapEnabled,
  showName,
  onDragEnd,
}: Props) {
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 最新の props を掴んでおく。PanResponder は作り直さない(作り直すと
  // 引いている最中に掴んでいる相手が入れ替わる)ので、閉じ込めた値が
  // 古くならないよう ref 経由で読む
  const latest = useRef({
    x,
    y,
    stageSize,
    isAudienceOnTop,
    isSnapEnabled,
    onDragEnd,
  });
  latest.current = { x, y, stageSize, isAudienceOnTop, isSnapEnabled, onDragEnd };

  /**
   * 掴んだと判定するまでに指が動いていたぶん。
   *
   * PanResponder は【掴んだ時点で dx/dy を 0 に戻す】。素直に gesture.dx を
   * 使うと、しきい値ぶん(8px)だけ短く置かれる — 1マス32pxの画面では
   * 0.25マスのずれになり、格子への吸着も外れる。判定した瞬間の値をここに
   * 控えて足し戻す(dnd-kit は押した位置からの総量を返すので、Web版と揃う)。
   */
  const beforeGrant = useRef({ dx: 0, dy: 0 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        // 押しただけでは掴まない。8px 動いて初めてドラッグとみなす
        // (でないと、選ぶつもりの一押しが移動になる)
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const shouldGrab =
            Math.abs(gesture.dx) > DRAG_THRESHOLD_PX ||
            Math.abs(gesture.dy) > DRAG_THRESHOLD_PX;
          if (shouldGrab) beforeGrant.current = { dx: gesture.dx, dy: gesture.dy };
          return shouldGrab;
        },

        onPanResponderMove: (_event, gesture) => {
          offset.setValue({
            x: gesture.dx + beforeGrant.current.dx,
            y: gesture.dy + beforeGrant.current.dy,
          });
        },

        onPanResponderRelease: (_event, gesture) => {
          const current = latest.current;
          const { width, height } = current.stageSize;
          const totalDx = gesture.dx + beforeGrant.current.dx;
          const totalDy = gesture.dy + beforeGrant.current.dy;
          if (width > 0 && height > 0) {
            // px の移動量をステージのユニットへ。幅と高さで比が違うので別々に
            const deltaX = pixelDeltaToUnitDelta(totalDx, width, stageWidthUnits);
            const deltaYScreen = pixelDeltaToUnitDelta(
              totalDy,
              height,
              stageHeightUnits,
            );
            // 上下を鏡にして描いているときは、指を下へ動かすとステージでは奥へ進む
            const deltaY = current.isAudienceOnTop ? -deltaYScreen : deltaYScreen;

            const snap = (value: number) =>
              current.isSnapEnabled ? snapToGrid(value, GRID_SNAP_TOLERANCE) : value;

            current.onDragEnd({
              x: snap(clamp(current.x + deltaX, 0, stageWidthUnits)),
              y: snap(clamp(current.y + deltaY, 0, stageHeightUnits)),
            });
          }
          // 確定した値は props(x, y) として返ってくるので、ここは 0 に戻す。
          // 戻し忘れると、次に掴んだときに前回のぶんが足されて飛ぶ
          offset.setValue({ x: 0, y: 0 });
          beforeGrant.current = { dx: 0, dy: 0 };
        },

        onPanResponderTerminate: () => {
          offset.setValue({ x: 0, y: 0 });
          beforeGrant.current = { dx: 0, dy: 0 };
        },
      }),
    [offset, stageWidthUnits, stageHeightUnits],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        position: 'absolute',
        left: `${(x / stageWidthUnits) * 100}%`,
        top: `${(screenY / stageHeightUnits) * 100}%`,
        marginLeft: -DOT / 2,
        marginTop: -DOT / 2,
        alignItems: 'center',
        transform: offset.getTranslateTransform(),
      }}
    >
      <View
        className="rounded-full"
        style={{ width: DOT, height: DOT, backgroundColor: dancer.color }}
      />
      {showName ? (
        <Text className="mt-0.5 text-[10px] text-fg-strong">{dancer.name}</Text>
      ) : null}
    </Animated.View>
  );
}
