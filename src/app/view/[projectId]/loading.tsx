import {
  ScreenSkeleton,
  SkeletonBox,
} from "@/components/molecules/ScreenSkeleton";

/**
 * 閲覧専用ビューアを開いている間に出す骨格。
 *
 * ここを開くのは、稽古場でリンクを踏んだダンサー。電波が細いことが
 * 前提の場所で、しかも【自分の番の直前】に開かれる。白い画面のまま
 * 数百ms止まると「開かない」と判断されて、もう一度踏まれる。
 *
 * 形はエディタではなくビューアのもの(ステージ / 道順の1行 / スクラブ帯)。
 */
export default function ViewerLoading() {
  return (
    <ScreenSkeleton>
      <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
        <header className="flex h-10 shrink-0 items-center gap-2 px-4">
          <SkeletonBox className="h-4 w-32" />
          <span className="flex-1" />
          <SkeletonBox className="h-8 w-20 rounded-2xl" />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3.5 landscape:flex-row md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1.5">
            <SkeletonBox className="h-2.5 w-24 rounded-full" />
            <SkeletonBox className="aspect-[14/10] w-full rounded-stage" />
            <SkeletonBox className="h-2.5 w-14 rounded-full" />
          </div>
        </div>

        <div className="shrink-0 px-3.5 pt-2">
          {/* 道順の1行 */}
          <SkeletonBox className="h-14 w-full rounded-[calc(var(--radius)*1.0833)]" />
          <SkeletonBox className="mt-2 h-14 w-full" />
          <div className="mt-1 flex items-center gap-2">
            <SkeletonBox className="h-9 w-9 shrink-0 rounded-full" />
            <SkeletonBox className="h-8 w-20 rounded-2xl" />
          </div>
        </div>
      </div>
    </ScreenSkeleton>
  );
}
