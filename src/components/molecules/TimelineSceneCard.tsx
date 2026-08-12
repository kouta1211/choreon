"use client";

import { useRef, useState, type PointerEvent } from "react";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import type { Scene } from "@/features/scene/types";

/** 通常のコマの幅。44px の当たり判定をほぼ満たす大きさ */
export const CARD_WIDTH = 46;
/** 選択中は一回り大きく。色の差だけでは横目で追えない */
export const SELECTED_CARD_WIDTH = 56;
/** 帯(80px)の中央に敷いた幕は40px。コマがそこからはみ出すと、
 * 波形の上に直接載って読めなくなる */
const MAX_CARD_HEIGHT = 42;
const MIN_CARD_HEIGHT = 24;

/** これ以上動いたらドラッグ(時刻を動かす)、それ未満はタップ(選択) */
const DRAG_THRESHOLD_PX = 4;

/**
 * コマの高さ。ステージの縦横比に合わせる。
 *
 * 8:6 のステージなら 46×34 / 56×42 になり、仕様書の実測値と一致する。
 * 幅を固定して高さを比から出しているのは、横長のステージでも
 * 正方形に潰れて見えないようにするため。
 */
export function cardHeight(
  width: number,
  stageWidthUnits: number,
  stageHeightUnits: number,
): number {
  const ratio = stageHeightUnits / Math.max(1, stageWidthUnits);
  return Math.round(
    Math.min(MAX_CARD_HEIGHT, Math.max(MIN_CARD_HEIGHT, width * ratio)),
  );
}

type Props = {
  scene: Scene;
  /** 1始まりの番号。曲の中では時刻より番号で呼ぶことが多い */
  number: number;
  /** 点を焼いたSVGのdataURL(useSceneThumbnailsが作る) */
  thumbnail: string | undefined;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isSelected: boolean;
  /** 帯の中での左位置(px)。コマは時刻の真上に中央で載る */
  leftPx: number;
  onSelect: () => void;
  /** 指を離したときに呼ぶ。動かした秒数(正なら後ろへ) */
  onMoveSeconds: (deltaSeconds: number) => void;
  pxPerSecond: number;
};

/**
 * 時間軸の上に置く、シーン1つぶんのコマ。
 *
 * ■ なぜ波形の【中央】に重ねるのか
 * 時刻の真上に座るので、引き出し線が要らない。再生ヘッドがコマを
 * 貫くので「いまこの隊形」がそのまま読める。波形は割らずに1つのままで、
 * コマの周りだけ幕(上下のフェード)を敷いて読めるようにしている。
 *
 * ■ 面を不透明にする理由
 * 波形が透けると、隊形の点と波形の縞が混ざって、どちらがダンサーなのか
 * 判別できなくなる。
 *
 * ■ 削除ボタンを置かない理由
 * 主対象がスマートフォンなのでホバーを前提にできず、常時表示すると
 * 46px の中に 28px の×が入ることになる。削除は一覧シートと
 * インスペクターにある。
 *
 * 横にドラッグすると時刻が動く。指の下で即座に付いてくるよう、
 * 動かしている間はtransformだけを触り、離したときに1回だけ保存する
 * (途中の位置をすべて保存すると、指1回で何十回も書き込むことになる)。
 */
export function TimelineSceneCard({
  scene,
  number,
  thumbnail,
  stageWidthUnits,
  stageHeightUnits,
  isSelected,
  leftPx,
  onSelect,
  onMoveSeconds,
  pxPerSecond,
}: Props) {
  // 動かした量は ref を正とし、state は見た目のためだけに持つ。
  // 指を離した瞬間の処理が state を読むと、直前の pointermove の更新が
  // まだ反映されておらず、動かした量を 0 として保存することがある
  const dragPxRef = useRef(0);
  const [dragPx, setDragPx] = useState(0);
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const width = isSelected ? SELECTED_CARD_WIDTH : CARD_WIDTH;
  const height = cardHeight(width, stageWidthUnits, stageHeightUnits);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    // 帯側のスクロールやシークに持って行かれないようにする
    event.stopPropagation();
    startXRef.current = event.clientX;
    movedRef.current = false;
    capturePointer(event.currentTarget, event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = startXRef.current;
    if (startX === null) return;

    const delta = event.clientX - startX;
    if (!movedRef.current && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    movedRef.current = true;
    dragPxRef.current = delta;
    setDragPx(delta);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = startXRef.current;
    startXRef.current = null;
    if (startX === null) return;
    releasePointer(event.currentTarget, event.pointerId);

    // 離した位置までを勘定に入れる。最後の pointermove から少し動いた
    // ぶんが切り捨てられると、置いた場所と保存される時刻がずれる
    if (movedRef.current) dragPxRef.current = event.clientX - startX;

    if (!movedRef.current) {
      onSelect();
      return;
    }
    // 掴んだコマは、まず選ぶ。どのシーンを動かしたのか分からないまま
    // 時刻だけ変わるのを避ける
    if (!isSelected) onSelect();
    onMoveSeconds(dragPxRef.current / pxPerSecond);
    dragPxRef.current = 0;
    setDragPx(0);
  };

  const handlePointerCancel = () => {
    startXRef.current = null;
    dragPxRef.current = 0;
    setDragPx(0);
  };

  return (
    <button
      type="button"
      data-scene-id={scene.id}
      aria-label={`${number}. ${scene.name}`}
      aria-current={isSelected}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        width,
        height,
        left: leftPx,
        marginLeft: -width / 2,
        transform: dragPx === 0 ? undefined : `translateX(${dragPx}px)`,
      }}
      className={`absolute top-1/2 -translate-y-1/2 touch-none overflow-hidden bg-stage ${
        dragPx === 0
          ? "transition-[width,height,border-color] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)]"
          : ""
      } ${
        isSelected
          ? "z-20 rounded-md border-2 border-accent shadow-[0_2px_12px_color-mix(in_oklab,var(--scrim)_80%,transparent)]"
          : "z-10 rounded-[5px] border border-line-strong"
      }`}
    >
      {/* 格子。ステージの升目と同じ数だけ引く。何列目に居るかが
          小さいコマでも読める */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
        style={{
          backgroundSize: `${100 / stageWidthUnits}% ${100 / stageHeightUnits}%`,
        }}
      />
      {thumbnail && (
        /* next/imageは使わない。中身はメモリ上のdataURLで、最適化サーバーを
           通す先のURLが無く、リサイズも遅延読み込みも働かないため */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />
      )}
      <span
        aria-hidden
        className={`absolute bottom-0 left-[2px] font-mono leading-none ${
          isSelected
            ? "text-[8px] font-semibold text-accent-bright"
            : "text-[7px] text-fg-muted"
        }`}
      >
        {number}
      </span>
    </button>
  );
}

/**
 * 詰まってコマを置けないときの旗。番号だけを出す。
 *
 * 22px の正方形にしているのは、次の段階(束ね)と【形で】見分けるため。
 * 警告と同じ理由で色に頼らない — 赤いダンサーが普通に存在するので、
 * 色の違いは「そういうダンサーが居る」と読まれる。
 */
export function TimelineSceneFlag({
  scene,
  number,
  isSelected,
  leftPx,
  onSelect,
}: {
  scene: Scene;
  number: number;
  isSelected: boolean;
  leftPx: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-scene-id={scene.id}
      aria-label={`${number}. ${scene.name}`}
      aria-current={isSelected}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
      style={{ left: leftPx, marginLeft: -11 }}
      className={`absolute top-1/2 z-10 flex h-[22px] w-[22px] -translate-y-1/2 touch-none items-center justify-center rounded-[4px] font-mono text-[9px] transition-colors ${
        isSelected
          ? "border-2 border-accent bg-surface font-semibold text-accent-bright"
          : "border border-line-strong bg-surface/94 text-fg-sub"
      }`}
    >
      {number}
    </button>
  );
}

/**
 * さらに詰まったところの束ね。数だけを出し、押すとその区間へ寄る。
 *
 * 横長の枠にしているのは旗(正方形)と区別するため。
 * ここに含まれるシーンは、拡大すればコマとして読める。
 */
export function TimelineSceneCluster({
  numbers,
  isSelected,
  leftPx,
  onZoom,
}: {
  /** 束ねに入っているシーンの番号(1始まり) */
  numbers: number[];
  isSelected: boolean;
  leftPx: number;
  onZoom: () => void;
}) {
  const count = numbers.length;
  return (
    <button
      type="button"
      aria-label={`シーン${numbers[0]}〜${numbers[count - 1]}が重なっています。押すと広げて、1つずつ選びます`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onZoom}
      style={{ left: leftPx, marginLeft: -23 }}
      className={`absolute top-1/2 z-10 flex h-[22px] w-[46px] -translate-y-1/2 touch-none items-center justify-center gap-0.5 rounded-full text-[9px] whitespace-nowrap transition-colors ${
        isSelected
          ? "border border-accent bg-surface text-accent-bright"
          : "border border-line-strong bg-surface/94 text-fg-sub"
      }`}
    >
      <span className="font-mono">{count}</span>
      シーン
    </button>
  );
}
