"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { ConcentricGuides } from "@/components/molecules/ConcentricGuides";
import { MARKER_SIZE } from "@/features/dancer/constants";
import { PressableButton } from "@/components/atoms/PressableButton";

/**
 * 「空いている領域に、縦横比を保ったまま目一杯収まる幅」を返す。
 *
 * aspect-ratioと max-width/max-height の組み合わせでは表現できない。
 * 片方の軸が確定していると、もう片方が上限で詰められても再計算されず、
 * 比率が崩れるため(実測で 8x8 のステージが 420x441 になった)。
 * 比率が崩れると、％で置いているダンサーの位置がまとめてずれる。
 *
 * そこで「入る方の小さい側」をmin()で直接指定する。親に
 * container-type:size を付けてあるので、cqw/cqhで空き領域の縦横を参照できる。
 *
 * ■ 縁に立つ人のぶんを空けてある
 * ダンサーの丸は座標を中心に描くので、ステージの縁ぴったりに立つと
 * 半分(MARKER_SIZE / 2)が外へはみ出す。ステージを空き領域いっぱいに
 * 広げると、そのはみ出したぶんが画面の外に出て丸が欠けて見えた
 * (スマートフォンでは横幅で決まるため必ずこうなる)。
 * 左右に半径ぶんずつ空けておけば、縁に立っても丸が最後まで見える。
 */
export function stageWidthRule(
  widthUnits: number,
  heightUnits: number,
): string {
  return `min(calc(100cqw - ${MARKER_SIZE}px), calc((100cqh - ${MARKER_SIZE}px) * ${widthUnits} / ${heightUnits}))`;
}

type Props = {
  /** ステージの横幅(projects.stage_widthのユニット数。1マス=1ユニット) */
  widthUnits: number;
  /** ステージの縦幅(projects.stage_height) */
  heightUnits: number;
  /** ダンサーアイコンを配置するためのスロット */
  children?: ReactNode;
  /** ステージの内側の隅に重ねるもの(元に戻す/やり直すなど)。
   * ステージの外に置くと縦を消費してしまうため、余白の少ない
   * スマートフォンではステージの内側に浮かせる */
  overlay?: ReactNode;
  /** 「客席側」ラベルの行の左端に置くもの(テンプレートの入口)。
   * ステージの中には重ねない — 常設のボタンをステージ面に置くと、
   * その下にダンサーが来たときに隠れてしまうため */
  belowStageLeft?: ReactNode;
  /** ドラッグ量(px)をステージ座標系に換算する際、実際の描画サイズを
   * 読み取れるためのための参照(React 19からforwardRef不要でrefを
   * 通常のpropsとして受け取れる) */
  ref?: Ref<HTMLDivElement>;
  /** ステージを横に払って前後のシーンへ移るジェスチャの受け口。
   * 渡された場合だけ、ブラウザに横スワイプを奪われないようにする */
  scrubHandlers?: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  /** 払ってシーンを送る操作が有効か。有効なときだけ、横スワイプを
   * ブラウザに奪われないようにする(切っているのに touch-action を
   * 潰すと、ページの操作を理由なく制限することになる) */
  isSwipeEnabled?: boolean;
  /** スクラブの進み具合。トラックと一緒に動いてしまわないよう、
   * 切り落とす層の外側に重ねる */
  scrubIndicator?: ReactNode;
};

/**
 * 客席から見た舞台。上がバックステージ(奥)、下が客席側(手前)。
 *
 * 高さの決まり方: 親から渡された高さいっぱい(h-full)を基準に、
 * aspect-ratioで横幅が決まる。横がはみ出す場合はmax-w-fullで頭打ちになり、
 * そのぶん高さが縮む(縦横比は保たれる)。
 * 「幅100%＋aspect-ratio」にすると、縦が足りないときに比率が崩れて
 * ダンサーの位置(％指定)がずれてしまうため、高さ基準にしている。
 */
export function Stage({
  widthUnits,
  heightUnits,
  children,
  overlay,
  belowStageLeft,
  ref,
  scrubHandlers,
  isSwipeEnabled = false,
  scrubIndicator,
}: Props) {
  const gridMode = useUIStore((state) => state.gridMode);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const dragSnapLine = useUIStore((state) => state.dragSnapLine);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-unit">
      <p className="text-center text-caption tracking-[0.16em] text-fg-muted uppercase">
        バックステージ
      </p>
      <div
        data-tour="stage"
        className={`relative flex min-h-0 w-full flex-1 items-center justify-center [container-type:size] ${
          isSwipeEnabled ? "touch-none" : ""
        }`}
        {...scrubHandlers}
      >
        <div
          ref={ref}
          /* 枠はアクセントで塗らない。ステージは常にそこに在るもので、
             「いま選んでいるもの」ではない。画面で一番強い線が床の縁だと、
             視線がダンサーではなく枠に行く */
          className={`relative touch-none rounded-stage border border-line-strong bg-stage transition-colors ${
            focusedDancerId ? "bg-surface-sunken" : ""
          }`}
          style={{
            aspectRatio: `${widthUnits} / ${heightUnits}`,
            width: stageWidthRule(widthUnits, heightUnits),
          }}
          data-testid="stage"
        >
          {gridMode === "square" && (
            <div
              data-testid="stage-grid"
              className={`pointer-events-none absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-[linear-gradient(to_right,var(--stage-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid)_1px,transparent_1px)] transition-opacity ${
                focusedDancerId ? "opacity-40" : ""
              }`}
              style={{
                backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
              }}
            />
          )}
          {gridMode === "circle" && (
            <div
              className={`pointer-events-none absolute inset-0 transition-opacity ${
                focusedDancerId ? "opacity-40" : ""
              }`}
            >
              <ConcentricGuides
                widthUnits={widthUnits}
                heightUnits={heightUnits}
              />
            </div>
          )}
          {/* 格子スナップが効いている間、吸着先の格子線をハイライトする。
              縦横どちらも出ていれば交差点への吸着だと分かる */}
          {dragSnapLine.x !== null && (
            <div
              data-testid="stage-snap-line-x"
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent-soft shadow-[0_0_6px_1px_color-mix(in_oklab,var(--accent-soft)_90%,transparent)]"
              style={{ left: `${(dragSnapLine.x / widthUnits) * 100}%` }}
            />
          )}
          {dragSnapLine.y !== null && (
            <div
              data-testid="stage-snap-line-y"
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-accent-soft shadow-[0_0_6px_1px_color-mix(in_oklab,var(--accent-soft)_90%,transparent)]"
              style={{ top: `${(dragSnapLine.y / heightUnits) * 100}%` }}
            />
          )}
          {focusedDancerId && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-[var(--veil)]"
            />
          )}
          {children}
          {overlay}
          {/* ステージの左下の角に、外側から寄せて置く(top-full = 枠のすぐ下)。
              ステージ【面】には重ねない — 常設のボタンを面に置くと、その下に
              ダンサーが来たときに隠れてしまうため。
              以前は「客席側」の行に置いていたが、あの行は空き領域の最下端に
              あり、ステージは空き領域の中央に置かれる。縦に余る画面ほど
              ステージから遠くへ離れてしまい、スマートフォンでは何十pxも下に
              取り残されていた。枠に付ければ、どの画面幅でも同じ距離に付く */}
          {belowStageLeft && (
            <span className="absolute top-full left-0 mt-1.5">
              {belowStageLeft}
            </span>
          )}
        </div>
        {scrubIndicator}
      </div>
      <div className="flex w-full items-center justify-center">
        <p className="text-center text-caption tracking-[0.16em] text-fg-muted uppercase">
          客席側
        </p>
      </div>
    </div>
  );
}

type EmptyStageProps = {
  widthUnits: number;
  heightUnits: number;
  onCreateScene: () => void;
  isCreating: boolean;
};

/**
 * シーンが1つも無いときにステージの代わりに出す。
 *
 * 以前は「シーンがありません。上のタイムラインから作成してください。」という
 * 案内文だけで、作る操作は別の場所を探しに行く必要があった。
 * 空っぽの舞台そのものを見せて、そこに作るボタンを置く方が短い。
 */
export function EmptyStage({
  widthUnits,
  heightUnits,
  onCreateScene,
  isCreating,
}: EmptyStageProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
      <div
        data-testid="empty-stage"
        className="relative flex flex-col items-center justify-center gap-2.5 rounded-stage border-2 border-dashed border-line-strong bg-stage"
        style={{
          aspectRatio: `${widthUnits} / ${heightUnits}`,
          width: stageWidthRule(widthUnits, heightUnits),
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)] opacity-70"
          style={{
            backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
          }}
        />
        <p className="relative text-[13.5px] font-medium text-fg">
          まだシーンがありません
        </p>
        <PressableButton
          kind="primary"
          onClick={onCreateScene}
          disabled={isCreating}
          className="relative flex h-10 items-center gap-1.5 rounded-[calc(var(--radius)*0.8333)] bg-accent px-4 text-[13px] font-semibold whitespace-nowrap text-accent-fg disabled:opacity-50"
        >
          最初のシーンを作る
        </PressableButton>
      </div>
    </div>
  );
}
