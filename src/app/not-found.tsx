import Link from "next/link";
import { Unlink } from "lucide-react";
import { getMessages } from "@/features/i18n/server";
import { LastViewedLink } from "@/components/molecules/LastViewedLink";
import { NoticeScreen } from "@/components/molecules/NoticeScreen";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return {
    title: t.notFound.title,
    robots: { index: false, follow: false },
  };
}

/**
 * 見つからなかったときの画面。
 *
 * ■ ここへ来るのは、たいてい【古い共有リンクを開いた人】
 * `notFound()` を呼んでいるのは3箇所とも「その作品を見せてよい相手か」の
 * 判断で(projects/[projectId] と view/[projectId])、**存在しない作品と、
 * 見せてよくない作品を区別せずに閉じている** — 「権限がありません」と
 * 返すと、その先に作品があること自体を教えてしまうため。
 *
 * つまりここに立つのは、アドレスを打ち間違えた人よりも、
 * **作り直されたリンクを開いた人**の方が多い。だから文はその人に向けて
 * 書き、「配った人に新しいリンクをもらう」という次の一手を示す。
 *
 * ■ 出口は端末の控えを先に出す
 * 開きたいのはたいてい「さっき見ていた振付」で、作品の一覧ではない
 * (圏外の画面と同じ理由)。控えが無ければ何も出ないので、
 * その下の一覧への行き先が残る。
 */
export default async function NotFound() {
  const t = await getMessages();

  return (
    <NoticeScreen
      icon={<Unlink size={24} />}
      heading={t.notFound.heading}
      body={t.notFound.body}
    >
      <LastViewedLink />
      <Link
        href="/"
        className="flex h-11 items-center rounded-xl border border-line-strong px-4 text-label text-fg"
      >
        {t.notFound.toProjects}
      </Link>
    </NoticeScreen>
  );
}
