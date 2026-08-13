import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata = {
  title: "オフライン — Choreon",
  robots: { index: false, follow: false },
};

/**
 * 圏外で、まだ一度も開いたことのない画面を出そうとしたときに出るもの。
 *
 * ■ 「読み込めません」で終わらせない
 * 稽古場で電波が切れるのは普通のことなので、失敗そのものより
 * 【いま何ができるか】を書く。一度開いた画面は控えから出るので、
 * 戻れば見られることが多い。
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong text-fg-muted"
      >
        <CloudOff size={24} />
      </span>
      <div>
        <h1 className="text-body font-semibold text-fg-strong">
          いま電波が届いていません
        </h1>
        <p className="mt-1.5 text-label leading-relaxed text-fg-sub">
          一度開いた画面は、そのまま見られます。
          <br />
          直前の画面へ戻るか、電波が戻ってから開き直してください。
        </p>
      </div>
      <Link
        href="/"
        className="flex h-11 items-center rounded-xl border border-line-strong px-4 text-label text-fg"
      >
        作品の一覧へ
      </Link>
    </main>
  );
}
