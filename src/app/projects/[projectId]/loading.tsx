import {
  ScreenSkeleton,
  SkeletonBox,
} from "@/components/molecules/ScreenSkeleton";

/**
 * エディタを開いている間に出す骨格。
 *
 * この画面はサーバーで作品・ダンサー・シーン・配置の4つを引いてから
 * 描かれる。回線の細い稽古場では、その数百msのあいだ【前の画面のまま】
 * 止まって見えていた。押したのに何も起きない、と受け取られる時間を
 * 作らないために、押した瞬間からこの形を出す。
 *
 * 出す形は本物のシャーシと同じ(ヘッダー / ステージ / ドック)。
 * 中身が届いたときに要素の位置が動かないので、画面が跳ねない。
 */
export default function EditorLoading() {
  return (
    <ScreenSkeleton>
      <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-clip md:max-[1199px]:max-w-3xl min-[1200px]:max-w-[1400px]">
          {/* ヘッダー: 戻る / 作品名 / 右端のボタン列 */}
          <header className="flex items-center gap-1.5 py-1 pr-3 pl-1.5">
            <SkeletonBox className="h-9 w-9 shrink-0 rounded-full" />
            <SkeletonBox className="h-5 w-40" />
            <span className="flex-1" />
            <SkeletonBox className="h-9 w-9 shrink-0" />
            <SkeletonBox className="h-9 w-9 shrink-0" />
          </header>

          {/* ステージ。比率まで本物に合わせると、届いた瞬間に枠が動かない */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-3.5 pb-1">
            <SkeletonBox className="h-2.5 w-24 rounded-full" />
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <SkeletonBox className="aspect-[14/10] h-auto w-full rounded-stage" />
            </div>
            <SkeletonBox className="h-2.5 w-14 rounded-full" />
          </div>

          {/* ドック: 持ち手 / 操作行 / 時間軸の帯 */}
          <div className="rounded-t-[calc(var(--radius)*1.5)] border-t border-line bg-surface pt-2.5 pb-3 md:rounded-none">
            <SkeletonBox className="mx-auto mb-2.5 h-1 w-9 rounded-full" />
            <div className="flex items-center gap-2.5 px-3.5">
              <SkeletonBox className="h-10 w-10 shrink-0 rounded-full" />
              <SkeletonBox className="h-4 w-32" />
              <span className="flex-1" />
              <SkeletonBox className="h-10 w-10 shrink-0" />
            </div>
            <div className="px-3.5 pt-2.5">
              <SkeletonBox className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </ScreenSkeleton>
  );
}
