"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { DancerMarker } from "./DancerIcon";
import { RotationHandle } from "./RotationHandle";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { quadraticBezierAt } from "@/features/canvas/lib/curvePath";
import {
  DEFAULT_TRANSITION_DURATION_SECONDS,
  SCENE_TRANSITION_EASE,
} from "@/features/canvas/constants";
import type { Dancer } from "@/features/dancer/types";

/** 選択中のダンサーを矢印キーで動かす際の1回あたりの移動量(ステージ座標系のユニット)。
 * Shiftキーを押しながらだとNUDGE_STEP_LARGEを使い、大きく移動できる */
const NUDGE_STEP_SMALL = 0.25;
const NUDGE_STEP_LARGE = 1;

type Props = {
  dancer: Dancer;
  x: number;
  y: number;
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  /** 回転ハンドルで指を離したときに呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onRotateEnd?: (dancerId: string, rotationAngle: number) => void;
  /** フォーカス中に矢印キーを押した時に呼ばれる。Supabase保存はCanvasBoard側に集約する */
  onNudge?: (dancerId: string, dx: number, dy: number) => void;
  /** シーン切り替え時、位置・向きの補間アニメーションにかける秒数
   * (選択中シーンのtransitionDurationSeconds)。省略時は0.3秒 */
  transitionDurationSeconds?: number;
  /** このシーンへ移動してくる際の曲線制御点(ステージ座標系)。
   * PathOverlayが描いている曲線と同じ制御点で、両方揃っている時だけ
   * 曲線に沿って移動する(片方でもnull/undefinedなら直線移動) */
  curveControlX?: number | null;
  curveControlY?: number | null;
  /** 「顔被りチェック」表示中、手前のダンサーに隠れていると判定されたか */
  isBlocked?: boolean;
  /** 次のシーンへの移動距離が現実的な範囲を超えているか(常時判定) */
  hasExcessiveMove?: boolean;
};

/**
 * DancerIconのドラッグ可能版。ドラッグ中はdnd-kitが返すtransform(px単位)を
 * そのままCSSに反映するだけで、Zustandへのコミットはしない。位置の確定は
 * 呼び出し側がDndContextのonDragEndで1回だけ行う(このコンポーネントは関与しない)。
 *
 * left/topはuseMotionValueで保持し、通常はanimate()でtransitionDurationSeconds
 * (省略時0.3秒)かけて補間する(シーン切り替えや保存失敗時のロールバックで
 * 滑らかに移動させるため。シーンごとに設定した遷移時間がここに反映されるので、
 * タイムライン再生中もこの同じ仕組みでダンサーが動く)。移動先のシーンに
 * 曲線制御点(curveControlX/Y)が設定されている場合は、left/topを別々に
 * 補間するのではなく進捗を1本だけ動かして二次ベジェ上の座標を求めることで、
 * PathOverlayが描いている曲線の通りに動かす。
 * ただし「自分をドラッグしていた→ドラッグが終わった」瞬間だけは例外で、
 * left/topをアニメーションさせずMotionValue.set()で即座に確定値へ合わせる。
 * ドラッグ中はdnd-kitのtransform(px)だけで見た目を動かしており、left/top自体は
 * ドラッグ前の値のまま止まっているため、ドロップの瞬間に「transformが消える」
 * のと「left/topが新しい値になる」のを同時に起こす必要があるが、後者を
 * animate()の宣言的な`animate`propで行うと、直後に起きる無関係な再レンダー
 * (他ダンサーの警告判定の再計算など)がtransition設定を上書きしてしまい、
 * 0.3秒版のtweenで再スタートしてしまう競合が起きる(実機で確認済み: 一瞬
 * ドラッグ開始位置まで巻き戻ってからスライドし直すように見える)。
 * MotionValue.set()による命令的なジャンプはこの競合と無縁なため、
 * ドロップ直後だけこちらを使う。
 *
 * 選択中は本体の外側に回転ハンドル(RotationHandle)を表示する。ハンドルの
 * ドラッグ中は見た目だけをliveRotationで即時更新し、指を離した時点で
 * 初めてonRotateEndを呼んで確定させる(位置ドラッグと同じ「ライブ中はローカル、
 * 確定時だけ親に伝える」方針)。
 *
 * memo化している: DancerLayerは選択中シーンのpositionsが1件でも変わると
 * 全ダンサー分map()し直すため、memoが無いと1人動かすだけで他の全アイコンの
 * コンポーネント関数まで再実行されてしまう。propsが実際に変わったダンサーだけ
 * 再レンダーされるようにする(onRotateEndがCanvasBoard側でuseCallback化され
 * 安定した参照になっていることが前提)。
 *
 * キーボードでの移動は、dnd-kitのKeyboardSensor(「スペースで掴む→矢印で
 * 動かす→スペースで離す」という2段階操作)を使わず、素のonKeyDownで直接
 * 実装している。フォーカスが当たっている状態で矢印キーを押すとその場で
 * すぐ動く(Shiftキー併用で大きく移動)。
 *
 * Tabキーでの巡回は無効にしている(tabIndex: -1、useDraggable参照)。
 * ダンサーの数だけTabを押させるのは操作性が悪く、またフォーカスが
 * 移るたびに選択状態も連動させるとDancerInspector(色変更・削除ボタンなど)が
 * 開いてTab移動の対象がさらに増えてしまう問題もあった。矢印キーで動かすには
 * クリックでフォーカスを合わせれば十分なため、Tabでの巡回自体をやめている。
 * フォーカス自体の見た目のフィードバック(点線リング)は、選択リングとは別に
 * hasKeyboardFocus(ローカルstate、onFocus/onBlurのみで管理)で出す。
 */
function DraggableDancerIconImpl({
  dancer,
  x,
  y,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
  onRotateEnd,
  onNudge,
  transitionDurationSeconds = DEFAULT_TRANSITION_DURATION_SECONDS,
  curveControlX,
  curveControlY,
  isBlocked = false,
  hasExcessiveMove = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // dataは格子スナップ用のModifier(gridSnapModifier)がactive.data.current経由で
  // 読み取る。ドラッグ開始時点の座標とステージサイズが分からないと、px単位の
  // transformをステージ座標系に変換できないため
  //
  // tabIndex: -1にしてTabキーの移動順から外している。ダンサーの数だけTabを
  // 押させるのは操作性が悪いため。クリック時にonClickで明示的に.focus()して
  // いるので、tabIndex: -1でもプログラムからのフォーカス自体は問題なく機能する
  // (Tabキーによる「巡回」だけを止めており、フォーカスそのものを禁止しては
  // いない)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dancer.id,
    data: { x, y, stageWidthUnits, stageHeightUnits },
    attributes: { tabIndex: -1 },
  });
  const isSelected = useUIStore(
    (state) => state.selectedDancerId === dancer.id,
  );
  const selectDancer = useUIStore((state) => state.selectDancer);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const isFocused = focusedDancerId === dancer.id;
  // 誰かがフォーカスされている間、自分以外は薄くして目立たなくする
  const isDimmed = focusedDancerId !== null && !isFocused;
  const [liveRotation, setLiveRotation] = useState<number | null>(null);
  // 選択(selectDancer)とは切り離した、純粋に「今キーボードフォーカスが
  // 当たっているか」の見た目用ローカルstate。Tab移動時にInspectorを
  // 開かせないための分離(詳しくは上のコメント参照)
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);
  const isDragging = transform !== null;

  // dnd-kitのsetNodeRefと、回転中心の座標を読み取るための自前refを
  // 同じDOMノードに両方つなぐ
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      rootRef.current = node;
    },
    [setNodeRef],
  );

  // このルート要素は子要素が全てposition:absoluteのため実サイズが0x0に潰れており、
  // getBoundingClientRect()の左上座標がそのままダンサーの中心座標(=回転の中心)になる
  const getCenter = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : null;
  }, []);

  // インラインのアロー関数のままだとRotationHandleに渡すたび新しい参照になり、
  // RotationHandleをmemo化していても位置ドラッグ中(=このコンポーネントが
  // 毎pointermoveごとに再レンダーされる間)に無駄な再レンダーを引き起こす
  const handleRotateHandleEnd = useCallback(
    (angle: number) => {
      setLiveRotation(null);
      onRotateEnd?.(dancer.id, angle);
    },
    [dancer.id, onRotateEnd],
  );

  // 矢印キーで直接移動させる(dnd-kitのドラッグは経由しない)。
  // event.preventDefault()を呼ばないと、ブラウザ標準の「矢印キーでページを
  // スクロールする」挙動が先に効いてしまい、ダンサーが動かないまま
  // 画面だけがスクロールしてしまう
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP_SMALL;
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case "ArrowLeft":
        dx = -step;
        break;
      case "ArrowRight":
        dx = step;
        break;
      case "ArrowUp":
        dy = -step;
        break;
      case "ArrowDown":
        dy = step;
        break;
      default:
        return;
    }
    event.preventDefault();
    onNudge?.(dancer.id, dx, dy);
  };

  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;
  const displayRotation = liveRotation ?? rotationAngle;

  // 位置は「%の数値」としてMotionValueに保持し、CSSへ渡す直前にuseTransformで
  // 単位付きの文字列("54.9%")へ変換する。CSSのleft/topは単位付きでないと
  // 無効になる(数値のままだとunitless扱いで反映されない)一方、曲線移動では
  // 「今どこにいるか」を数値として読み取ってベジェ計算の始点にする必要が
  // あるため、保持は数値・出力は文字列と役割を分けている
  const leftPct = useMotionValue(leftPercent);
  const topPct = useMotionValue(topPercent);
  const left = useTransform(leftPct, (value) => `${value}%`);
  const top = useTransform(topPct, (value) => `${value}%`);
  const wasDraggingRef = useRef(isDragging);

  // 制御点もステージ座標系から%へ直しておく(x/yと同じ土俵に乗せる)。
  // 片方だけ設定されている状態は曲線として意味を成さないので直線扱いにする
  const hasCurve = curveControlX != null && curveControlY != null;
  const controlLeftPercent = hasCurve
    ? (curveControlX / stageWidthUnits) * 100
    : null;
  const controlTopPercent = hasCurve
    ? (curveControlY / stageHeightUnits) * 100
    : null;

  useEffect(() => {
    const justFinishedDragging = wasDraggingRef.current && !isDragging;
    wasDraggingRef.current = isDragging;
    // ドラッグ中はleft/topを動かさない(dnd-kitのtransformだけで見た目を動かす)
    if (isDragging) return;
    if (justFinishedDragging) {
      leftPct.set(leftPercent);
      topPct.set(topPercent);
      return;
    }

    // 曲線制御点があるシーンへ移動する時は、left/topをそれぞれ独立に補間する
    // (=結果として直線になる)のではなく、進捗t(0→1)を1本だけ動かし、そこから
    // 毎フレーム二次ベジェ上の座標を求める。PathOverlayがSVGで描いている曲線と
    // 同じ式・同じ制御点を使うため、表示されている線の通りに動く。
    // 始点は「今この瞬間、画面上でどこにいるか」(=直前のシーンの位置)を
    // MotionValueから読む。propsのx/yは既に移動先の値になっているため使えない
    if (controlLeftPercent !== null && controlTopPercent !== null) {
      const fromLeft = leftPct.get();
      const fromTop = topPct.get();
      // 位置が変わらないダンサーにまで曲線補間を走らせると、制御点の方向へ
      // 膨らんでから元の位置へ戻るという不自然な動きになるため、何もしない
      // (PathOverlayも位置が変わらないダンサーには線を引かないので、
      // 見えていない曲線に沿って動くこともなくなる)
      if (fromLeft === leftPercent && fromTop === topPercent) return;
      const curveAnimation = animate(0, 1, {
        duration: transitionDurationSeconds,
        ease: SCENE_TRANSITION_EASE,
        onUpdate: (progress) => {
          leftPct.set(
            quadraticBezierAt(fromLeft, controlLeftPercent, leftPercent, progress),
          );
          topPct.set(
            quadraticBezierAt(fromTop, controlTopPercent, topPercent, progress),
          );
        },
      });
      return () => curveAnimation.stop();
    }

    const leftAnimation = animate(leftPct, leftPercent, {
      duration: transitionDurationSeconds,
      ease: SCENE_TRANSITION_EASE,
    });
    const topAnimation = animate(topPct, topPercent, {
      duration: transitionDurationSeconds,
      ease: SCENE_TRANSITION_EASE,
    });
    return () => {
      leftAnimation.stop();
      topAnimation.stop();
    };
  }, [
    isDragging,
    leftPercent,
    topPercent,
    leftPct,
    topPct,
    transitionDurationSeconds,
    controlLeftPercent,
    controlTopPercent,
  ]);

  return (
    <motion.div
      ref={setRefs}
      data-testid="dancer-icon"
      className="absolute touch-none select-none"
      animate={{ opacity: isDimmed ? 0.3 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        left,
        top,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      onClick={(event) => {
        selectDancer(dancer.id);
        // クリックした場所によっては(見た目上の本体は子のSVGなど)ブラウザの
        // デフォルトのフォーカス移動が必ずしもこの要素(tabIndex=-1)まで
        // 届かないことがある。キーボード操作(矢印キーで移動)はこの要素に
        // フォーカスが当たっていないと使えないため、クリックした際は
        // 明示的にこの要素へフォーカスを合わせる
        event.currentTarget.focus();
      }}
      onFocus={() => setHasKeyboardFocus(true)}
      onBlur={() => setHasKeyboardFocus(false)}
      onKeyDown={handleKeyDown}
      {...listeners}
      {...attributes}
    >
      <DancerMarker
        dancer={dancer}
        rotationAngle={displayRotation}
        isSelected={isSelected}
        isRotating={liveRotation !== null}
        isFocused={isFocused}
        isBlocked={isBlocked}
        hasExcessiveMove={hasExcessiveMove}
        hasKeyboardFocus={hasKeyboardFocus}
        transitionDurationSeconds={transitionDurationSeconds}
      />
      {isSelected && (
        <RotationHandle
          angle={displayRotation}
          onRotateChange={setLiveRotation}
          onRotateEnd={handleRotateHandleEnd}
          getCenter={getCenter}
        />
      )}
    </motion.div>
  );
}

export const DraggableDancerIcon = memo(DraggableDancerIconImpl);
