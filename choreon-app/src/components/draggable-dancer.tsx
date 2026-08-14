import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Text, View } from 'react-native';

import {
  clamp,
  pixelDeltaToUnitDelta,
  snapToGrid,
} from '@/features/canvas/lib/dragMath';
import { mirrorAngle } from '@/features/canvas/lib/stageFlip';
import { RotationHandle } from '@/components/rotation-handle';
import type { Dancer } from '@/features/dancer/types';
import type { MoveStrain } from '@/features/canvas/lib/physicalLimits';
import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

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
  /** いまの向き（ステージ座標系。0度=客席側、時計回り） */
  rotationAngle: number;
  /** 選ばれているか。選ばれている人にだけ回すつまみが出る */
  isSelected: boolean;
  /** 軽く押したとき（＝掴まずに離したとき） */
  onTap: () => void;
  /** 回し終えたとき。ステージ座標系の角度で返す */
  onRotateEnd: (angle: number) => void;
  /** 払っている最中の濃さ。片側のシーンにしか居ない人が出入りする */
  opacity?: number;
  /** ステージ全体を払っている間は、その人だけを掴めないようにする */
  isDraggable?: boolean;
  /** 指を離した時に1回だけ呼ばれる。保存はここではなく呼び出し側 */
  onDragEnd: (next: { x: number; y: number }) => void;
  /**
   * シーンが変わったときに、次の隊形まで動くのにかける秒数。
   *
   * **区間の実際の長さ**（次のシーンの時刻 − このシーンの時刻）を渡す。
   * Web版もそうしていて、通しで見たときに「4秒かけて移動する」が
   * そのまま4秒かかる。0 を渡すと瞬間移動（隣り合わないシーンへ飛んだとき）。
   */
  transitionSeconds: number;
  /** 客席から見て、手前の人に顔が隠れている（顔被り） */
  isBlocked?: boolean;
  /** 次のシーンへの移動が速すぎる。数値は m/s */
  excessiveMove?: MoveStrain | null;
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
  rotationAngle,
  isSelected,
  isAudienceOnTop,
  isSnapEnabled,
  showName,
  opacity = 1,
  isDraggable = true,
  onTap,
  onRotateEnd,
  onDragEnd,
  transitionSeconds,
  isBlocked = false,
  excessiveMove = null,
}: Props) {
  const t = useT();

  /** 回している最中の見た目だけの角度。離すまで確定しない */
  const [liveAngle, setLiveAngle] = useState<number | null>(null);

  // 保存されている6色を、いまのテーマの6色へ読み替える(紙のテーマでは
  // 沈んだ色になる)。保存の値そのものは変えない
  const theme = useThemeStore((state) => state.preference.theme);
  const color = themedDancerColor(dancer.color, theme);
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
    onTap,
  });
  latest.current = { x, y, stageSize, isAudienceOnTop, isSnapEnabled, onDragEnd, onTap };

  const draggable = useRef(isDraggable);
  draggable.current = isDraggable;

  /**
   * 掴んだと判定するまでに指が動いていたぶん。
   *
   * PanResponder は【掴んだ時点で dx/dy を 0 に戻す】。素直に gesture.dx を
   * 使うと、しきい値ぶん(8px)だけ短く置かれる — 1マス32pxの画面では
   * 0.25マスのずれになり、格子への吸着も外れる。判定した瞬間の値をここに
   * 控えて足し戻す(dnd-kit は押した位置からの総量を返すので、Web版と揃う)。
   */
  const beforeGrant = useRef({ dx: 0, dy: 0 });

  /**
   * シーンを移ったときに、前の位置から滑らせる。
   *
   * left/top は確定した位置なので、そのままだと瞬間移動になる。**先に
   * 「前の位置との差」を transform に入れてから 0 へ animate する**と、
   * 見た目だけが前の位置から滑ってくる(left/top は動かさない)。
   *
   * ■ 自分のドラッグで動いたときは滑らせない
   * 置いた瞬間に「掴む前の位置から滑る」と、指の下から本体が逃げて見える。
   * Web版も同じ理由で、ドロップ直後だけアニメーションを飛ばしている。
   */
  const previous = useRef({ x, y });
  const justDragged = useRef(false);

  useEffect(() => {
    const from = previous.current;
    previous.current = { x, y };

    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    // 払っている最中は、指の進み具合が毎フレーム位置を決めている。
    // ここで時間ベースのアニメーションを重ねると、2つが同じ値を取り合う
    // (Web版 useDancerMotion と同じ理由)
    if (!isDraggable) return;
    if (from.x === x && from.y === y) return;
    if (stageSize.width === 0 || stageSize.height === 0) return;
    // 隣り合わないシーンへ飛んだときは 0 が来る。滑らせずに移す
    // (通っていない区間を、あたかも通ったように見せない)
    if (transitionSeconds <= 0) return;

    const unitX = stageSize.width / stageWidthUnits;
    const unitY = stageSize.height / stageHeightUnits;
    // 画面の向きで数える(客席を上にしているときは上下が逆)
    const sign = isAudienceOnTop ? -1 : 1;
    offset.setValue({
      x: (from.x - x) * unitX,
      y: (from.y - y) * unitY * sign,
    });
    const animation = Animated.timing(offset, {
      toValue: { x: 0, y: 0 },
      duration: transitionSeconds * 1000,
      easing: Easing.out(Easing.cubic),
      // ネイティブでは別スレッドで動かす。Web にはその仕組みが無く、
      // true のままだと毎回警告が出て JS 側へ落ちる
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [
    x,
    y,
    offset,
    stageSize.width,
    stageSize.height,
    stageWidthUnits,
    stageHeightUnits,
    isAudienceOnTop,
    isDraggable,
    transitionSeconds,
  ]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // 押しただけでは掴まない。8px 動いて初めてドラッグとみなす
        // (でないと、選ぶつもりの一押しが移動になる)
        // 軽く押しただけ（＝動かさずに離した）は「選ぶ」。掴んで動かすのは
        // 8px 動いてから(下の onMoveShouldSetPanResponder)。押した時点で
        // 責任者になっておかないと、タップがどこにも届かない
        onStartShouldSetPanResponder: () => true,
        // ステージを縦にスクロールしたい指は譲る
        onPanResponderTerminationRequest: () => true,

        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (!draggable.current) return false;
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

          // 動かしていない＝タップ。選ぶだけで、位置は触らない
          if (
            Math.abs(totalDx) <= DRAG_THRESHOLD_PX &&
            Math.abs(totalDy) <= DRAG_THRESHOLD_PX
          ) {
            current.onTap();
            offset.setValue({ x: 0, y: 0 });
            beforeGrant.current = { dx: 0, dy: 0 };
            return;
          }

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

            // 自分で置いた結果の位置変化は、滑らせずにその場で確定させる
            justDragged.current = true;
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

  // 画面に描く向き。上下が逆なら鼻先も逆を向いていなければならない
  // (＝既定の0度「客席を向く」が、客席のある側を向いたままになる)
  const angle = liveAngle ?? (isAudienceOnTop ? mirrorAngle(rotationAngle) : rotationAngle);
  const screenRotation = angle;

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
        opacity,
        transform: offset.getTranslateTransform(),
      }}
    >
      {/* 本体と鼻先。向きは【画面の向き】で描く(客席を上にしていれば鏡) */}
      <View
        style={{
          width: DOT,
          height: DOT,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${screenRotation}deg` }],
        }}
      >
        <View
          className="rounded-full"
          style={{ width: DOT, height: DOT, backgroundColor: color }}
        />
        {/* 0度＝客席側＝画面の下。鼻先も下へ出す */}
        <View
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 9,
            bottom: -5,
            backgroundColor: color,
          }}
        />
      </View>

      {isSelected ? (
        <>
          <View
            pointerEvents="none"
            className="absolute rounded-full border-2 border-accent"
            style={{ width: DOT + 10, height: DOT + 10, top: -5, left: -5 }}
          />
          <RotationHandle
            displayAngle={screenRotation}
            onChange={setLiveAngle}
            onEnd={(next) => {
              setLiveAngle(null);
              // 画面の向きで受け取った角度を、保存する向きへ戻す
              onRotateEnd(isAudienceOnTop ? mirrorAngle(next) : next);
            }}
          />
        </>
      ) : null}

      {/* 印。丸の【右上】に出す。名前は下に出るので重ならない。
          2つ付く人もいるので、横に並べる */}
      {isBlocked || excessiveMove ? (
        <View
          pointerEvents="none"
          className="absolute flex-row gap-0.5"
          style={{ top: -8, left: DOT - 6 }}
        >
          {isBlocked ? <Badge text={t.stage.blockedBadge} tone="warn" /> : null}
          {excessiveMove ? (
            <Badge text={`${excessiveMove.speedMetersPerSecond.toFixed(1)}`} tone="alert" />
          ) : null}
        </View>
      ) : null}

      {showName ? (
        <Text className="mt-0.5 text-[10px] text-fg-strong">{dancer.name}</Text>
      ) : null}
    </Animated.View>
  );
}

/**
 * 丸の肩に付く小さな印。
 *
 * Web版はホバーで説明が出る帯だが、指の画面にホバーは無い。**ひと目で
 * 「何かある」と分かる**ことだけを受け持ち、意味は下の説明文で補う。
 * 速すぎる移動は数値（m/s）をそのまま出す — 「速い」より「3.5を超えている」
 * の方が、直したときに直ったと分かる。
 */
function Badge({ text, tone }: { text: string; tone: 'warn' | 'alert' }) {
  return (
    <View
      className={`items-center justify-center rounded-full px-1 ${
        tone === 'alert' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
      }`}
      style={{ minWidth: 16, height: 16 }}
    >
      <Text className="text-[9px] font-semibold text-white">{text}</Text>
    </View>
  );
}
