"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { ConcentricGuides } from "@/components/molecules/ConcentricGuides";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
// 読み込み中の骨格(loading.tsx)も同じ大きさで描くので、この式は
// client/server のどちらからも読める場所に置いてある
import { stageWidthRule } from "@/features/canvas/lib/stageSize";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** ステージの横幅(projects.stage_widthのユニット数。1マス=1ユニット) */
  widthUnits: number;
  /** ステージの縦幅(projects.stage_height) */
  heightUnits: number;
  /** ダンサーアイコンを配置するためのスロット */
  children?: ReactNode;
  /** ステージ枠のすぐ下、左端に置くもの(テンプレートの入口)。
   * ステージの中には重ねない — 常設のボタンをステージ面に置くと、
   * その下にダンサーが来たときに隠れてしまうため */
  belowStageLeft?: ReactNode;
  /** 同じく右端に置くもの(元に戻す/やり直す)。
   * 以前はステージの内側に浮かせていたが、床の目盛りと重なって
   * 数字が読めず、その位置に立つダンサーも隠していた */
  belowStageRight?: ReactNode;
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
  belowStageLeft,
  belowStageRight,
  ref,
  scrubHandlers,
  isSwipeEnabled = false,
  scrubIndicator,
}: Props) {
  const t = useT();
  const gridMode = useUIStore((state) => state.gridMode);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);
  const dragSnapLine = useUIStore((state) => state.dragSnapLine);
  const isCenterLineVisible = useSettingsStore(
    (state) => state.isCenterLineVisible,
  );
  // 客席を上にして描くか。ここでは札の入れ替えだけを受け持ち、
  // 立ち位置の写しは描く側(DancerLayer配下)が行う(stageFlip.ts)
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);

  return (
    /* 下に 56px 空けてある。**枠の外に垂れ下がっている常設のボタン
       (テンプレートの入口・元に戻す)のぶん**で、ここを取っておかないと
       ボタンがシーンの帯に食い込む。以前は場所を取らせずに垂らしていたので、
       下の帯と重なって「ゆとりが無い」という指摘になった。
       ダンサーを選んだときの帯も同じ空きに乗るので、ステージの面に
       被らなくなる(帯に高さを持たせるとステージが縮んで、選んだ瞬間に
       全員の位置がずれて見えるため、高さは持たせない) */
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-14">
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
          {/* ステージの4辺の札。**枠に付ける**のが要点(2026-08-19、実機の報告)。
              外側の入れ物に置くと、ステージは空き領域の中央に来るのに札は
              端に残るので、縦に余る画面ほど遠くへ離れていく
              (ステージ下のボタン列で同じことを踏んで、同じ直し方をした)。

              4つとも枠の**外**。左右を中に入れると、ステージの床に文字が
              乗って隊形の邪魔になる（実機の報告 06-8）。外に出せるのは、
              stageWidthRule が左右に MARKER_SIZE ぶんの余白を残しているから。

              左右は入れ替えない。「客席を上にする」が写すのは Y だけで、
              X は動かさないため(stageFlip.ts)。上下の札だけが入れ替わる */}
          <span
            aria-hidden
            className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-caption tracking-[0.16em] whitespace-nowrap text-fg-muted uppercase"
          >
            {isAudienceOnTop ? t.editor.downstage : t.editor.upstage}
          </span>
          <span
            aria-hidden
            className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 text-caption tracking-[0.16em] whitespace-nowrap text-fg-muted uppercase"
          >
            {isAudienceOnTop ? t.editor.upstage : t.editor.downstage}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-full mr-1 -translate-y-1/2 text-caption tracking-[0.16em] text-fg-muted uppercase [writing-mode:vertical-rl]"
          >
            {t.editor.houseLeft}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-full ml-1 -translate-y-1/2 text-caption tracking-[0.16em] text-fg-muted uppercase [writing-mode:vertical-rl]"
          >
            {t.editor.houseRight}
          </span>
          {gridMode === "square" && (
            <div
              data-testid="stage-grid"
              className={`pointer-events-none absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-[linear-gradient(to_right,var(--stage-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid)_1px,transparent_1px)] transition-opacity ${
                focusedDancerId ? "opacity-40" : ""
              }`}
              style={{
                /* 1マスごとに引く。吸着(dragMath の snapToGrid)が寄せる先は
                   常に整数=1マスなので、線を間引くと「線の無いところに
                   吸い付く」ことになり、格子が置ける場所を指さなくなる。
                   細かすぎるときは 表示とモード で目盛りごと消せる */
                backgroundSize: `${100 / widthUnits}% ${100 / heightUnits}%`,
              }}
            />
          )}
          {/* センターライン。中央(0の列)は隊形の基準になるので、
              格子とは【種類の違う線】にする。

              以前は --line-strong(白18%)で、格子の --stage-grid(白6%)と
              「同じ白い線の濃さ違い」でしかなかった。そのため消しても差が
              読み取れず、設定を切り替えた手応えが無かった。アクセントを
              混ぜると、格子の中で1本だけ意味を持つ線として拾える
              (color-mix なので10テーマそれぞれの色に追従する)。

              **それでも「ほとんど変化が感じられない」という指摘が来た**ので、
              1px・55% から 2px・80% へ上げた。格子は1マスごとに引かれていて
              線の本数が多く、その中の1本を色だけで見分けさせるには
              太さも要る。切ったときに何が消えたのかが分かる強さが要る */}
          {isCenterLineVisible && gridMode !== "none" && (
            <div
              aria-hidden
              data-testid="stage-center-line"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[color-mix(in_oklab,var(--accent)_80%,transparent)]"
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
          {/* ステージの左下の角に、外側から寄せて置く(top-full = 枠のすぐ下)。
              ステージ【面】には重ねない — 常設のボタンを面に置くと、その下に
              ダンサーが来たときに隠れてしまうため。
              以前は「客席側」の行に置いていたが、あの行は空き領域の最下端に
              あり、ステージは空き領域の中央に置かれる。縦に余る画面ほど
              ステージから遠くへ離れてしまい、スマートフォンでは何十pxも下に
              取り残されていた。枠に付ければ、どの画面幅でも同じ距離に付く */}
          {belowStageLeft && (
            <span className="absolute top-full left-0 mt-2.5">
              {belowStageLeft}
            </span>
          )}
          {belowStageRight && (
            <span className="absolute top-full right-0 mt-2.5">
              {belowStageRight}
            </span>
          )}
        </div>
        {scrubIndicator}
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
  const t = useT();
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
        <p className="relative text-label font-medium text-fg">
          {t.editor.noScenesYet}
        </p>
        <PressableButton
          kind="primary"
          onClick={onCreateScene}
          disabled={isCreating}
          className="relative flex h-10 items-center gap-1.5 rounded-[calc(var(--radius)*0.8333)] bg-accent px-4 text-label font-semibold whitespace-nowrap text-accent-fg disabled:opacity-50"
        >
          {t.editor.createFirstScene}
        </PressableButton>
      </div>
    </div>
  );
}
