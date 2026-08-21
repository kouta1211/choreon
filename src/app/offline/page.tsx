import Link from "next/link";
import { CloudOff } from "lucide-react";
import { getMessages } from "@/features/i18n/server";
import { LastViewedLink } from "@/components/molecules/LastViewedLink";
import { NoticeScreen } from "@/components/molecules/NoticeScreen";
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
 *
 * 作りは「見つかりません」(app/not-found.tsx)と同じで、言うことだけが
 * 違う。**同じものを2つ組まない**ので、器は NoticeScreen が持つ。
 */
export default async function OfflinePage() {
  const t = await getMessages();

  return (
    <NoticeScreen
      icon={<CloudOff size={24} />}
      heading={t.offline.heading}
      body={t.offline.body}
    >
      {/* 控えがあれば、そちらを主にする。圏外で開きたいのは
          たいてい「さっき見ていた振付」で、作品の一覧ではない */}
      <LastViewedLink />
      <Link
        href="/"
        className="flex h-11 items-center rounded-xl border border-line-strong px-4 text-label text-fg"
      >
        {t.offline.toProjects}
      </Link>
    </NoticeScreen>
  );
}
