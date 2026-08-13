import {
  ScreenSkeleton,
  SkeletonBox,
} from "@/components/molecules/ScreenSkeleton";
import { stageWidthRule } from "@/features/canvas/lib/stageSize";
import { DEFAULT_SETTINGS } from "@/features/settings/lib/settings";

/**
 * エディタを開いている間に出す骨格。
 *
 * この画面はサーバーで作品・ダンサー・シーン・配置の4つを引いてから
 * 描かれる。回線の細い稽古場では、その数百msのあいだ【前の画面のまま】
 * 止まって見えていた。押したのに何も起きない、と受け取られる時間を
 * 作らないために、押した瞬間からこの形を出す。
 *
 * 出す形は本物のシャーシと同じ(EditorLayout)。中身が届いたときに
 * 要素の位置が動かないので、画面が跳ねない。
 *
 * ■ ステージの大きさは本物と同じ式で出す
 * 以前は `w-full` で描いていた。狭い画面ではたまたま合っていたが、
 * 広い画面では横いっぱいの巨大な板になり、届いた瞬間に本来の大きさへ
 * 縮んでいた。骨格の目的そのもの(位置が動かない)を果たせていなかったので、
 * 本物と同じ stageWidthRule を使う。
 *
 * ■ 比は作品ごとに違うが、まだ分からない
 * ステージの縦横は作品が持っていて、この時点では取得できていない。
 * 既定(14×10)を仮に置く。既定のまま使っている作品ではぴったり合い、
 * 変えている作品でも「横いっぱいの板」よりはるかに近い。
 */
const { defaultStageWidth: WIDTH_UNITS, defaultStageHeight: HEIGHT_UNITS } =
  DEFAULT_SETTINGS;

export default function EditorLoading() {
  return (
    <ScreenSkeleton>
      <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-clip md:max-[1199px]:max-w-3xl min-[1200px]:max-w-[1400px]">
          {/* ヘッダー: 戻る / 作品名 / 右端のボタン列。
              高さの指定(h-target-lg)は本物のヘッダーと同じものを使う。
              ここが低いと、余った高さがそのままステージへ回る */}
          <header className="flex h-target-lg items-center gap-base px-base">
            <SkeletonBox className="h-11 w-11 shrink-0 rounded-full" />
            <SkeletonBox className="h-5 w-40" />
            <span className="flex-1" />
            <SkeletonBox className="h-11 w-11 shrink-0 rounded-full" />
            <SkeletonBox className="h-11 w-11 shrink-0 rounded-full" />
          </header>

          {/* 中央の段。広い画面では左右にパネルが出るので、骨格にも出す。
              ここが空のままだと、届いた瞬間にステージが横へ詰められる */}
          <div className="flex min-h-0 flex-1 gap-3 px-3.5 pb-1 md:gap-4 md:px-4">
            {/* 3ペインのときの左レール(シーン一覧) */}
            <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
              <SkeletonBox className="w-[268px] shrink-0 rounded-xl" />
            </div>

            {/* ステージ。比率も大きさも本物に合わせる。
                札の行は【本物と同じ高さ(16px)を確保したうえで】細い棒を置く。
                ここを詰めると、そのぶんステージへ回る高さが増えて、
                本物より一回り大きい板になってしまう */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2">
              <span className="flex h-4 shrink-0 items-center">
                <SkeletonBox className="h-2.5 w-24 rounded-full" />
              </span>
              <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
                <SkeletonBox
                  className="rounded-stage"
                  style={{
                    aspectRatio: `${WIDTH_UNITS} / ${HEIGHT_UNITS}`,
                    width: stageWidthRule(WIDTH_UNITS, HEIGHT_UNITS),
                  }}
                />
              </div>
              <span className="flex h-4 shrink-0 items-center">
                <SkeletonBox className="h-2.5 w-14 rounded-full" />
              </span>
            </div>

            {/* 2ペインの右パネル(シーン/ダンサーをタブで切替) */}
            <div className="hidden md:max-[1199px]:flex md:max-[1199px]:min-h-0">
              <SkeletonBox className="w-[288px] shrink-0 rounded-xl" />
            </div>
            {/* 3ペインの右パネル(ダンサー専用) */}
            <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
              <SkeletonBox className="w-[288px] shrink-0 rounded-xl xl:w-[300px]" />
            </div>
          </div>

          {/* ドック: 持ち手 / 操作行 / 時間軸。
              余白と高さは本物のドック(SceneDock)と同じ指定にしてある。
              ここの高さがステージの大きさを決めるので、ずれると
              「骨格のステージだけ一回り大きい」という形で表に出る */}
          <div className="shrink-0 rounded-t-3xl border-t border-line-strong bg-surface pt-unit pb-gutter md:rounded-none">
            {/* 持ち手は狭い画面だけ(広い画面には開く相手が無い) */}
            <SkeletonBox className="mx-auto mb-unit h-1 w-9 rounded-full md:hidden" />
            <div className="flex items-center gap-gutter px-gutter">
              <SkeletonBox className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-base">
                <SkeletonBox className="h-5 w-32" />
                <SkeletonBox className="h-3 w-44" />
              </div>
              <SkeletonBox className="h-12 w-24 shrink-0" />
            </div>
            {/* 時間軸。帯の高さの出どころは TIMELINE_LAYOUT の bandHeight
                (スマホ80 / タブレット84 / PC96)。倍率のボタンはPCだけ出る */}
            <div className="mt-2.5 flex flex-col gap-1.5 px-gutter">
              <SkeletonBox className="h-20 w-full md:max-[1199px]:h-21 min-[1200px]:h-24" />
              <span className="hidden justify-end min-[1200px]:flex">
                <SkeletonBox className="h-7 w-16 rounded-full" />
              </span>
              <div className="flex items-center gap-2.5">
                <SkeletonBox className="h-9 w-9 shrink-0" />
                <SkeletonBox className="h-1.5 flex-1 rounded-full" />
                <SkeletonBox className="h-3 w-16 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenSkeleton>
  );
}
