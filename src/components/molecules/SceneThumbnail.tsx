import { X } from "lucide-react";
import type { Scene } from "@/features/scene/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  scene: Scene;
  /** 点を焼いたSVGのdataURL(useSceneThumbnailsが作る)。
   * まだ出来ていない一瞬は空でよく、そのときは格子だけが見える */
  thumbnail: string | undefined;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isSelected: boolean;
  onClick: () => void;
  /** サムネイル本体の幅(px)。シーン一覧シートは78px、狭いサイドバーは64px */
  sizePx?: number;
  /** ミニチュアの中に格子を描くか。小さく出す場所では線が潰れて
   * ノイズになるだけなので、大きく出す側でだけ描く */
  showGrid?: boolean;
  /** 名前の行を出すか。ストリップ(SceneTabs)はここに出し、
   * シーン一覧(SceneList)は行ごと別レイアウトで組むので出さない。
   *
   * ボタンの【中】に入れているのは、名前の部分を押しても選択できるように
   * するため。外に出すと、見た目は1つのコマなのに文字だけ反応しない */
  showLabel?: boolean;
  /** 渡すと右上に×を出す。押したときに何をするかは呼び出し側が決める
   * (このアプリでは確認ダイアログを開く。シーン削除は元に戻せないため、
   * ×から即削除にはしない) */
  onDelete?: () => void;
};

const DEFAULT_SIZE_PX = 74;

/**
 * シーン1コマ分のミニチュア。ステージ上の各ダンサーの位置を色付きの点で
 * 描くだけの簡易版(名前や向きまでは出さない。小さすぎて読めないため、
 * 「どんな配置か」がひと目で分かれば十分)。
 *
 * 【並び替えのつまみではない】。以前はここに useSortable が付いていて、
 * 一覧の行を並び替えるにはこの小さな四角を掴むしかなかった。掴む役目は
 * 行そのもの(SceneList)へ移したので、ここは「選ぶボタン」に戻っている。
 *
 * 外枠が<div>で、その中に「選ぶボタン」と「×ボタン」が並んでいるのは、
 * <button>の入れ子が不正なHTMLだから。
 */
export function SceneThumbnail({
  scene,
  thumbnail,
  stageWidthUnits,
  stageHeightUnits,
  isSelected,
  onClick,
  sizePx = DEFAULT_SIZE_PX,
  showGrid = false,
  showLabel = false,
  onDelete,
}: Props) {
  const t = useT();

  return (
    <div
      data-scene-id={scene.id}
      style={{ width: sizePx }}
      className="relative shrink-0"
    >
      <PressableButton onClick={onClick} className="flex w-full flex-col">
        {/* 選択中は縁の色だけでなく、一回り持ち上げて手前に出す。
          コマが小さく密に並ぶので、色の差だけでは横目で追えない */}
        <div
          className={`card-surface-sunken relative w-full overflow-hidden rounded-md transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(.2,.7,.2,1)] ${
            isSelected
              ? "border-2 border-accent shadow-[0_14px_34px_-18px_color-mix(in_oklab,var(--accent)_80%,transparent)] scale-105"
              : "border border-line-strong"
          }`}
          style={{ aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}` }}
        >
          {showGrid && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
              style={{
                backgroundSize: `${100 / stageWidthUnits}% ${100 / stageHeightUnits}%`,
              }}
            />
          )}
          {/* 点は1枚の画像に焼いてある(useSceneThumbnails)。
            人数×シーン数だけの要素を並べる代わりに、シーンごとに1枚で済む。
            まだ焼けていない一瞬(初回描画)は、格子だけの空の枠を出す */}
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
        </div>
        {/* 通し番号は出さない(実機の報告 17-4)。番号は下のバーの見出しと
            一覧が持っていて、幅74pxのコマの中では名前を狭めるだけだった */}
        {showLabel && (
          <span
            className={`mt-1 block w-full truncate text-caption ${
              isSelected ? "font-semibold text-accent-soft" : "text-fg-sub"
            }`}
          >
            {scene.name}
          </span>
        )}
      </PressableButton>

      {onDelete && (
        <PressableButton
          kind="icon"
          onClick={onDelete}
          aria-label={t.sceneActions.remove(scene.name)}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-surface-strong text-fg-muted hover:border-red-950 hover:text-red-400"
        >
          <X size={11} />
        </PressableButton>
      )}
    </div>
  );
}
