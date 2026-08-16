import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';

import { snapRotation } from '@/features/canvas/lib/dragMath';
import { useT } from '@/features/i18n/store/useLocaleStore';

/** ダンサー本体の中心からハンドルまでの距離(px)。Web版と同じ */
const HANDLE_DISTANCE_PX = 46;
/** つまみの当たり判定。指で狙える大きさ(44px)を確保する */
const KNOB_TOUCH_PX = 44;

type Props = {
  /** いまの向き（画面の向きに写したあと。0度=画面の下、時計回り） */
  displayAngle: number;
  /** 引いている間の見た目の更新。確定はしない */
  onChange: (nextDisplayAngle: number) => void;
  /** 指を離したとき。ここで初めて確定する */
  onEnd: (nextDisplayAngle: number) => void;
};

/**
 * 選択中のダンサーに出る、向きを変えるつまみ。
 *
 * ■ 角度の規約は Web版と同じ
 * 0度 = 客席側 = 画面の下、時計回りに増える。8方向(45度刻み)の近くまで
 * 来たら吸着する(`snapRotation`)。「客席を向く」「下手を向く」のように
 * 言葉で言える向きは狙って合わせたいが、指先で1度単位は出せないため。
 *
 * ■ 画面上の座標を測らずに角度を出す
 * Web版は「中心の実座標」と「指の実座標」から atan2 を取る。React Native で
 * 実座標を得るには measureInWindow(非同期)が要り、指を動かすたびに呼ぶには
 * 重い。代わりに **掴んだ時点でのつまみの位置（中心からの相対）** に指の
 * 移動量を足して、同じ atan2 を取る。測らずに済み、結果は同じ。
 */
export function RotationHandle({ displayAngle, onChange, onEnd }: Props) {
  const t = useT();
  // 掴んだ時点の角度。ここから相対で計算する
  const startAngle = useRef(displayAngle);
  const latest = useRef({ displayAngle, onChange, onEnd });
  latest.current = { displayAngle, onChange, onEnd };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // ステージの「払ってシーンを送る」に持っていかれないよう、
        // ここで掴んだ指は渡さない
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          startAngle.current = latest.current.displayAngle;
        },

        onPanResponderMove: (_event, gesture) => {
          latest.current.onChange(angleFrom(startAngle.current, gesture.dx, gesture.dy));
        },

        onPanResponderRelease: (_event, gesture) => {
          latest.current.onEnd(angleFrom(startAngle.current, gesture.dx, gesture.dy));
        },
      }),
    [],
  );

  // つまみの位置。0度(客席側)なら真下
  const radians = (displayAngle * Math.PI) / 180;
  const knobX = -Math.sin(radians) * HANDLE_DISTANCE_PX;
  const knobY = Math.cos(radians) * HANDLE_DISTANCE_PX;

  return (
    <>
      {/* 中心からつまみへの案内線。回すときに「どこを持っているか」が見える */}
      <View
        pointerEvents="none"
        className="absolute bg-accent"
        style={{
          left: 0,
          top: 0,
          width: 1,
          height: HANDLE_DISTANCE_PX,
          opacity: 0.7,
          transform: [
            { translateX: -0.5 },
            { rotate: `${-displayAngle}deg` },
            { translateY: HANDLE_DISTANCE_PX / 2 },
          ],
        }}
      />
      <View
        {...responder.panHandlers}
        // つまみに名前が無かった。回すための的なので、見えない人にも
        // 「ここが向きを変える所」と分かる必要がある
        accessibilityRole="adjustable"
        accessibilityLabel={t.stage.rotate}
        accessibilityValue={{ text: t.stage.rotateValue(Math.round(displayAngle)) }}
        className="absolute items-center justify-center"
        style={{
          left: 0,
          top: 0,
          width: KNOB_TOUCH_PX,
          height: KNOB_TOUCH_PX,
          marginLeft: -KNOB_TOUCH_PX / 2,
          marginTop: -KNOB_TOUCH_PX / 2,
          transform: [{ translateX: knobX }, { translateY: knobY }],
        }}
      >
        <View className="h-6 w-6 rounded-full border-2 border-accent bg-surface-strong" />
      </View>
    </>
  );
}

/**
 * 掴んだ時点のつまみの位置に、指の移動量を足して角度を出す。
 *
 * `atan2(-dx, dy)` は「下方向を0度、時計回り」。通常の atan2(dy, dx) は
 * 右方向が0度・反時計回りなので、そのままでは使えない(Web版と同じ式)。
 */
function angleFrom(startAngle: number, dx: number, dy: number): number {
  const radians = (startAngle * Math.PI) / 180;
  const fromCenterX = -Math.sin(radians) * HANDLE_DISTANCE_PX + dx;
  const fromCenterY = Math.cos(radians) * HANDLE_DISTANCE_PX + dy;
  const degrees = (Math.atan2(-fromCenterX, fromCenterY) * 180) / Math.PI;
  return snapRotation((degrees + 360) % 360);
}
