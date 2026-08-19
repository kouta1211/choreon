import Link from "next/link";
import { CloudOff } from "lucide-react";
import { getMessages } from "@/features/i18n/server";
import { LastViewedLink } from "@/components/molecules/LastViewedLink";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return {
    title: t.offline.title,
    robots: { index: false, follow: false },
  };
}

/**
 * 圏外で、まだ一度も開いたことのない画面を出そうとしたときに出るもの。
 *
 * ■ 「読み込めません」で終わらせない
 * 稽古場で電波が切れるのは普通のことなので、失敗そのものより
 * 【いま何ができるか】を書く。一度開いた画面は控えから出るので、
 * 戻れば見られることが多い。
 */
export default async function OfflinePage() {
  const t = await getMessages();

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
          {t.offline.heading}
        </h1>
        <p className="mt-1.5 text-label leading-relaxed text-fg-sub">
          {t.offline.body}
        </p>
      </div>
      {/* 控えがあれば、そちらを主にする。圏外で開きたいのは
          たいてい「さっき見ていた振付」で、作品の一覧ではない */}
      <LastViewedLink />

      <Link
        href="/"
        className="flex h-11 items-center rounded-xl border border-line-strong px-4 text-label text-fg"
      >
        {t.offline.toProjects}
      </Link>
    </main>
  );
}
