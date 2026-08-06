"use client";

import { motion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import type { Dancer } from "@/features/dancer/types";

type Props = {
  dancer: Dancer;
  /** ステージ座標系での位置(0..stageWidthUnits / 0..stageHeightUnits) */
  x: number;
  y: number;
  /** 向き(度)。0度 = ステージ上方向(客席から見て奥)を向く */
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** マーカーの表示サイズ(px)。SVGのviewBox(0..32)をこのサイズへ拡大して描画する */
const MARKER_SIZE = 40;

/**
 * 真上から見た人物のシルエット(頭+鼻先)。回転の中心はSVG座標で頭の中心と
 * 一致させている(頭は円なので回転しても見た目が変わらず、その場に留まる)。
 * こうすることで、頭の上に重ねる文字ラベルは「回転しない別レイヤー」として
 * 常に同じ位置に置くだけで済み、角度ごとに位置を再計算する必要がなくなる。
 * 実際に回転して見えるのは、頭からずれた位置にある鼻先(向きの手がかり)だけ。
 */
export function DancerMarker({
  dancer,
  rotationAngle,
  isSelected = false,
  isRotating = false,
  isFocused = false,
  isBlocked = false,
  hasExcessiveMove = false,
}: {
  dancer: Dancer;
  rotationAngle: number;
  isSelected?: boolean;
  /** 回転ハンドルでドラッグ中はtrue。true の間はアニメーションを挟まず
   * 指の動きに瞬時追従させ、falseに戻った瞬間(ドロップ確定・シーン切替)
   * だけmotionで滑らかに補間する */
  isRotating?: boolean;
  /** 「マイ・フォーカス」で強調表示中かどうか。選択(isSelected)とは別の状態
   * (選択はインスペクターを開くための一時的な状態、フォーカスは
   * シーンをまたいで維持される「自分を目立たせる」ための状態) */
  isFocused?: boolean;
  /** 「顔被りチェック」で、手前の他のダンサーに隠れていると判定された場合true。
   * trueの間は自分の色ではなく警告色で塗る */
  isBlocked?: boolean;
  /** 次のシーンへの移動距離が現実的な範囲を超えている場合true。
   * 警告バッジを表示する(常時判定、トグルなし) */
  hasExcessiveMove?: boolean;
}) {
  const bodyColor = isBlocked ? "#dc2626" : dancer.color;

  return (
    <>
      <motion.div
        aria-hidden
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
        style={{ width: MARKER_SIZE, height: MARKER_SIZE }}
        animate={{ rotate: rotationAngle, scale: isFocused ? 1.15 : 1 }}
        transition={{ duration: isRotating ? 0 : 0.3, ease: "easeOut" }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full overflow-visible">
          {isFocused && (
            <circle
              data-testid="dancer-focus-ring"
              cx={16}
              cy={16}
              r={15}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={3}
            />
          )}
          {isSelected && (
            <circle
              data-testid="dancer-selection-ring"
              cx={16}
              cy={16}
              r={15}
              fill="none"
              stroke="#ec4899"
              strokeWidth={2}
            />
          )}
          {/* 鼻先(向きの手がかり)。頭からずれた位置にあるため、回転すると
              頭の周りを振り子のように動いて見える */}
          <polygon
            points="16,4 12,10 20,10"
            fill={bodyColor}
            stroke="rgba(0,0,0,0.15)"
          />
          {/* 頭(=本体)。回転の中心と一致しているため、回転してもその場から動かない */}
          <circle
            data-testid="dancer-body"
            cx={16}
            cy={16}
            r={8}
            fill={bodyColor}
            stroke="rgba(0,0,0,0.15)"
          />
        </svg>
      </motion.div>
      {/* 名前ラベル。円の中に収まらない長さもあるため、円の下に
          常に正立するかたちで表示する(回転する本体とは別レイヤー) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm dark:bg-white/90 dark:text-zinc-900"
        style={{
          transform: `translate(-50%, 0%) translateY(${MARKER_SIZE / 2 + 4}px)`,
        }}
      >
        {dancer.name}
      </div>
      {hasExcessiveMove && (
        <div
          data-testid="dancer-excessive-move-badge"
          aria-label="次のシーンへの移動距離が大きすぎます"
          className="pointer-events-none absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${MARKER_SIZE / 2 - 4}px, ${-MARKER_SIZE / 2 + 4}px)`,
          }}
        >
          <TriangleAlert size={11} strokeWidth={2.5} />
        </div>
      )}
    </>
  );
}

export function DancerIcon({
  dancer,
  x,
  y,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;

  return (
    <div
      data-testid="dancer-icon"
      className="absolute"
      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
    >
      <DancerMarker dancer={dancer} rotationAngle={rotationAngle} />
    </div>
  );
}
