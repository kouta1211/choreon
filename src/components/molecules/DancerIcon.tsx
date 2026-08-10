"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { DancerNameLabel } from "@/components/atoms/DancerNameLabel";
import { DancerExcessiveMoveBadge } from "@/components/atoms/DancerExcessiveMoveBadge";
import { MARKER_SIZE } from "@/features/dancer/constants";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
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

/**
 * 真上から見た人物のシルエット(頭+鼻先)。回転の中心はSVG座標で頭の中心と
 * 一致させている(頭は円なので回転しても見た目が変わらず、その場に留まる)。
 * こうすることで、頭の上に重ねる文字ラベルは「回転しない別レイヤー」として
 * 常に同じ位置に置くだけで済み、角度ごとに位置を再計算する必要がなくなる。
 * 実際に回転して見えるのは、頭からずれた位置にある鼻先(向きの手がかり)だけ。
 *
 * memo化している: 位置ドラッグ中は親のDraggableDancerIconがdnd-kitのcontext
 * 購読により毎pointermoveごとに再レンダーされる(これ自体はdnd-kitの仕組み上
 * 避けられない)。このコンポーネントのprops(向き・選択状態・強調表示など)は
 * 位置ドラッグでは一切変わらないため、memoでSVGの再生成をスキップできる。
 */
function DancerMarkerImpl({
  dancer,
  rotationAngle,
  isSelected = false,
  isRotating = false,
  isFocused = false,
  isBlocked = false,
  hasExcessiveMove = false,
  hasKeyboardFocus = false,
  transitionDurationSeconds = 0.3,
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
  /** キーボードフォーカスが当たっているかどうか。isSelectedとは別の状態で、
   * 「今ここにフォーカスがある=矢印キーで動かせる」ことを示すだけの見た目上の
   * ヒント。Tabキーでの巡回は無効にしてある(DraggableDancerIconのtabIndex: -1)
   * ため、フォーカスはクリックによって当たる */
  hasKeyboardFocus?: boolean;
  /** シーン切り替え時、向きの補間アニメーションにかける秒数。省略時は0.3秒 */
  transitionDurationSeconds?: number;
}) {
  // 顔被りの警告色だけはテーマに関係なく赤(意味を運ぶ色なので固定)
  const bodyColor = isBlocked ? "#dc2626" : themedDancerColor(dancer.color);
  // シーンを切り替えると顔被りの判定がやり直され、この色が入れ替わる。
  // 移動しながら色が瞬時に変わると点滅して見えるので、色だけ短く送らせる
  // (Tailwind v4のtransition-colorsはfillとstrokeも対象に含む)
  const bodyColorTransition = "transition-colors";

  return (
    <>
      <motion.div
        aria-hidden
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
        style={{ width: MARKER_SIZE, height: MARKER_SIZE }}
        animate={{ rotate: rotationAngle, scale: isFocused ? 1.15 : 1 }}
        transition={{
          duration: isRotating ? 0 : transitionDurationSeconds,
          ease: "easeOut",
        }}
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
              stroke="var(--accent)"
              strokeWidth={2}
            />
          )}
          {/* 選択リングとは別に、キーボードフォーカスがあることだけを示す破線リング。
              選択中(isSelected)は実線リングと重なって見づらいので出さない */}
          {hasKeyboardFocus && !isSelected && (
            <circle
              data-testid="dancer-keyboard-focus-ring"
              cx={16}
              cy={16}
              r={15}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}
          {/* 鼻先(向きの手がかり)。頭からずれた位置にあるため、回転すると
              頭の周りを振り子のように動いて見える */}
          <polygon
            points="16,4 12,10 20,10"
            fill={bodyColor}
            stroke="rgba(0,0,0,0.15)"
            className={bodyColorTransition}
          />
          {/* 頭(=本体)。回転の中心と一致しているため、回転してもその場から動かない */}
          <circle
            data-testid="dancer-body"
            cx={16}
            cy={16}
            r={8}
            fill={bodyColor}
            stroke="rgba(0,0,0,0.15)"
            className={bodyColorTransition}
          />
          {/* 紙・黒板系のテーマで「塗り」を「輪郭」に切り替えるための重ね。
              CSSは変数の値で分岐できないので、常に上に重ねておき、
              テーマが持つ変数だけで見え方を変えている:
                暗い系  … --marker-fill: none / 線幅0 → 何も描かれず下の塗りが残る
                紙・黒板 … 素材の色で塗りつぶし、ダンサー色の輪郭が乗る
              こうするとJSでテーマを読む必要がなく、SSRでもズレない */}
          <polygon
            points="16,4 12,10 20,10"
            fill="var(--marker-fill)"
            stroke={bodyColor}
            strokeWidth="var(--marker-stroke-width)"
            className={bodyColorTransition}
          />
          <circle
            data-testid="dancer-body-outline"
            cx={16}
            cy={16}
            r={8}
            fill="var(--marker-fill)"
            stroke={bodyColor}
            strokeWidth="var(--marker-stroke-width)"
            className={bodyColorTransition}
          />
        </svg>
      </motion.div>
      {/* 輪郭表示のときだけ見える頭文字。回転レイヤーの外に置いているので、
          向きを変えても文字は正立したまま。暗い系では --marker-initial が
          transparent なので描かれていても見えない */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[11px] font-bold text-[var(--marker-initial)]"
        style={{ width: MARKER_SIZE, height: MARKER_SIZE }}
      >
        {[...dancer.name][0] ?? ""}
      </span>
      <DancerNameLabel name={dancer.name} />
      {hasExcessiveMove && <DancerExcessiveMoveBadge />}
    </>
  );
}

export const DancerMarker = memo(DancerMarkerImpl);

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
