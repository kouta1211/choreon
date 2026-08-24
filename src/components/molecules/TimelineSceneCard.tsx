"use client";

import { useRef, useState, type PointerEvent } from "react";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";
import {
  CARD_NAME_BAR_HEIGHT,
  maxCardHeight,
  type TimelineLayout,
} from "@/features/music/lib/timelineLayout";
import type { Scene } from "@/features/scene/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

/** これ以上動いたらドラッグ、それ未満はタップ(選択) */
const DRAG_THRESHOLD_PX = 4;

/**
 * 押したままこれだけ待つと、コマを掴む(時刻を動かせる)。
 *
 * **待たずに引いたら、帯の方が動く**（user の指示 2026-08-22）。
 * コマの帯は 64px あって帯全体の大半を占めるので、コマの上から
 * 始めた操作を全部こちらが取ると、波形を引ける場所がほとんど残らない。
 * 時間軸の「押しっぱなしで自由に置く」と同じ長さにそろえてある。
 */
const GRAB_HOLD_MS = 450;

const MIN_CARD_HEIGHT = 24;

/**
 * コマの高さ。ステージの縦横比に合わせる。
 *
 * 8:6 のステージなら 46×34 / 56×42(スマホ)、72×54 / 84×62(PC)になり、
 * 仕様書の実測値と一致する。幅を固定して高さを比から出しているのは、
 * 横長のステージでも正方形に潰れて見えないようにするため。
 *
 * 上限は中央の幕の高さ。そこからはみ出すと、コマが波形の上に直接
 * 載って読めなくなる。
 */
export function cardHeight(
  width: number,
  stageWidthUnits: number,
  stageHeightUnits: number,
  maxHeight: number,
): number {
  const ratio = stageHeightUnits / Math.max(1, stageWidthUnits);
  return Math.round(
    Math.min(maxHeight, Math.max(MIN_CARD_HEIGHT, width * ratio)),
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
  /** この画面の段での寸法 */
  layout: TimelineLayout;
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
  layout,
}: Props) {
  // 動かした量は ref を正とし、state は見た目のためだけに持つ。
  // 指を離した瞬間の処理が state を読むと、直前の pointermove の更新が
  // まだ反映されておらず、動かした量を 0 として保存することがある
  const dragPxRef = useRef(0);
  const [dragPx, setDragPx] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  /** 押したまま待って、コマを掴んだか。掴むまでは帯に譲る */
  const isGrabbedRef = useRef(false);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const width = isSelected ? layout.selectedCardWidth : layout.cardWidth;
  const height = cardHeight(
    width,
    stageWidthUnits,
    stageHeightUnits,
    maxCardHeight(layout),
  );


  /**
   * 押した。**ここでは帯を止めない**（user の指示 2026-08-22:
   * 「コマの上を横へ引いたときは、帯を動かす。コマの移動は別の手で」）。
   *
   * 以前は押した瞬間に `stopPropagation` していたので、**コマの上から
   * 始めた操作では波形を引けなかった**。コマの帯は 64px あり、帯全体
   * （96px）の大半を占めるので、「引けないときがある」の正体になっていた。
   *
   * 代わりに、**押したまま待つとコマを掴む**（一覧の並び替えと同じ作法）。
   * 待っている間に動いたら、それは帯を引く操作なので手を出さない。
   */
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    /* **待ってから使うものは、ここで控えておく。**
       React は合成イベントのハンドラを抜けた時点で `currentTarget` を
       null に戻す（react-dom の executeDispatch）。setTimeout の中で
       読むと null で、`setPointerCapture` が例外になって握り潰され、
       **掴んだつもりで掴めていない**状態になっていた。
       そうなると帯の外で離した指を取り逃し、**押していないマウスに
       コマが付いてくる**（実機の報告・2026-08-24） */
    const grabTarget = event.currentTarget;
    const { pointerId } = event;

    startXRef.current = event.clientX;
    movedRef.current = false;
    isGrabbedRef.current = false;
    setIsPressed(true);

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      // 待っている間に動いていたら、帯を引いている。掴まない
      if (movedRef.current) return;
      isGrabbedRef.current = true;
      setIsGrabbed(true);
      capturePointer(grabTarget, pointerId);
      vibrate(TAP_PATTERN);
    }, GRAB_HOLD_MS);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = startXRef.current;
    if (startX === null) return;

    /* **離したあとの移動は、掴みの続きではない。**
       掴むのは指を捕まえてから（setPointerCapture）だが、これは
       失敗しうる（pointerCapture.ts のコメント）。捕まえられないまま
       帯の外で離すと pointerup がここへ来ず、押していないのに
       コマが付いてくる。ボタンが1つも押されていない移動で降りる */
    if (event.buttons === 0) {
      endGesture();
      return;
    }

    const delta = event.clientX - startX;
    if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;

    // 掴む前に動いたら、それは帯を引く操作。こちらは何もしない
    if (!isGrabbedRef.current) {
      movedRef.current = true;
      return;
    }
    /* **掴んだあとは、帯に譲らない。**
       押した時点では譲る（そうしないとコマの上から波形を引けない）が、
       掴んでからも譲ると、帯が「引き始めた」と見なして指を捕まえる。
       そうなると離した合図がコマへ届かず、**置いた場所が保存されない** */
    event.stopPropagation();
    movedRef.current = true;
    dragPxRef.current = delta;
    setDragPx(delta);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = startXRef.current;
    startXRef.current = null;
    setIsPressed(false);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (startX === null) return;

    const wasGrabbed = isGrabbedRef.current;
    isGrabbedRef.current = false;
    setIsGrabbed(false);
    if (wasGrabbed) releasePointer(event.currentTarget, event.pointerId);

    /* 掴まないまま動いたのなら、帯を引いていた。こちらは何もしない
       （シークもしない — 帯の側が自分で始末する） */
    if (!wasGrabbed && movedRef.current) {
      dragPxRef.current = 0;
      setDragPx(0);
      return;
    }

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

  /** 掴みを畳んで、何も起こさずに元へ戻す */
  const endGesture = () => {
    startXRef.current = null;
    setIsPressed(false);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    isGrabbedRef.current = false;
    setIsGrabbed(false);
    dragPxRef.current = 0;
    setDragPx(0);
  };

  const handlePointerCancel = () => {
    endGesture();
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
        // 掴んで動かすものなので、押しても沈めずに持ち上げる
        // (オーバーレイ仕様 §1-4。ダンサーのマーカーと同じ扱い)
        transform: `translateX(${dragPx}px) scale(${isGrabbed ? 1.12 : isPressed ? 1.08 : 1})`,
      }}
      className={`absolute top-1/2 -translate-y-1/2 touch-none overflow-hidden bg-stage ${
        dragPx === 0
          ? "transition-[width,height,border-color,transform,box-shadow] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
          : "transition-[transform] duration-0"
      } ${
        isSelected
          ? "z-20 rounded-md border-2 border-accent shadow-[0_2px_12px_color-mix(in_oklab,var(--scrim)_80%,transparent)]"
          : "z-10 rounded-md border border-line-strong"
      } ${
        /* 掴めたら、押しただけのときより一段持ち上げる。
           待った甲斐があったことを形で返さないと、いつ掴めたのか
           分からないまま引くことになる */
        isGrabbed
          ? "z-30 ring-2 ring-accent shadow-[0_6px_16px_-4px_color-mix(in_oklab,var(--scrim)_70%,transparent)]"
          : isPressed
            ? "z-30 shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--scrim)_60%,transparent)]"
            : ""
      }`}
    >
      <span aria-hidden className="absolute inset-0 block overflow-hidden">
        {/* 格子。ステージの升目と同じ数だけ引く。何列目に居るかが
            小さいコマでも読める */}
        <span
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
            className="absolute inset-0 h-full w-full"
          />
        )}
      </span>

      {layout.showCardName ? (
        /* 番号と名前の帯。選択中はアクセントで塗る。曲の中では時刻より
           番号で呼ぶことが多いので、番号を先に置く */
        <span
          aria-hidden
          style={{ height: CARD_NAME_BAR_HEIGHT }}
          className={`absolute inset-x-0 bottom-0 flex items-center gap-1 px-1 ${
            isSelected
              ? "bg-accent text-accent-fg"
              : "bg-surface-raised text-fg-sub"
          }`}
        >
          <span className="shrink-0 font-mono text-caption leading-none">
            {number}
          </span>
          <span className="min-w-0 truncate text-caption leading-none">
            {scene.name}
          </span>
        </span>
      ) : (
        <span
          aria-hidden
          className={`absolute bottom-0 left-[2px] font-mono leading-none ${
            isSelected
              ? "text-caption font-semibold text-accent-bright"
              : "text-caption text-fg-muted"
          }`}
        >
          {number}
        </span>
      )}
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
    <PressableButton
      kind="icon"
      data-scene-id={scene.id}
      aria-label={`${number}. ${scene.name}`}
      aria-current={isSelected}
      // 帯側のスクロールやシークに持って行かれないようにする。
      // PressableButton は渡した関数を消さずに自分の処理を足す
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
      style={{ left: leftPx, marginLeft: -11 }}
      className={`absolute top-1/2 z-10 flex h-[22px] w-[22px] -translate-y-1/2 touch-none items-center justify-center rounded-sm font-mono text-caption transition-colors ${
        isSelected
          ? "border-2 border-accent bg-surface font-semibold text-accent-bright"
          : "border border-line-strong bg-surface/94 text-fg-sub"
      }`}
    >
      {number}
    </PressableButton>
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
  const t = useT();
  const count = numbers.length;
  return (
    <PressableButton
      kind="icon"
      aria-label={t.music.stacked(numbers[0], numbers[count - 1])}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onZoom}
      style={{ left: leftPx, marginLeft: -23 }}
      className={`absolute top-1/2 z-10 flex h-[22px] w-[46px] -translate-y-1/2 touch-none items-center justify-center gap-0.5 rounded-full text-caption whitespace-nowrap transition-colors ${
        isSelected
          ? "border border-accent bg-surface text-accent-bright"
          : "border border-line-strong bg-surface/94 text-fg-sub"
      }`}
    >
      <span className="font-mono">{count}</span>
      {t.music.scenesShort}
    </PressableButton>
  );
}
