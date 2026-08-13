import {
  ScreenSkeleton,
  SkeletonBox,
} from "@/components/molecules/ScreenSkeleton";

/**
 * トップページ(作品の一覧)を開いている間に出す骨格。
 *
 * 一覧はサーバーで作品・シーン・ダンサー・先頭シーンの配置まで引いてから
 * 描かれる(カードにサムネイルを出すため)。件数が増えるほど待ちが伸びるので、
 * カードの形だけ先に出しておく。
 *
 * 未ログインのときのトップはゲストのエディタで、そちらはサーバーから
 * 何も取らないため、この骨格が出るのは一瞬か、まったく出ない。
 */
export default function HomeLoading() {
  return (
    <ScreenSkeleton>
      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto w-full max-w-md space-y-4 md:max-w-3xl">
          <div className="flex items-center gap-3">
            <SkeletonBox className="h-11 w-11 rounded-[calc(var(--radius)*1.0833)]" />
            <SkeletonBox className="h-6 w-32" />
            <span className="flex-1" />
            <SkeletonBox className="h-11 w-11 rounded-[calc(var(--radius)*1.0833)]" />
          </div>

          <div className="flex items-center gap-3">
            <SkeletonBox className="h-12 flex-1 rounded-xl" />
            <SkeletonBox className="h-12 w-12 shrink-0 rounded-xl" />
          </div>

          <SkeletonBox className="h-3 w-24" />

          {/* カード3枚。実際の件数は分からないので、よくある数だけ出す */}
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3"
              >
                <SkeletonBox className="h-16 w-24 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <SkeletonBox className="h-4 w-40" />
                  <SkeletonBox className="h-3 w-28" />
                </div>
                <SkeletonBox className="h-11 w-11 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenSkeleton>
  );
}
