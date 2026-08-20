"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  deleteProject,
  updateProjectTitle,
} from "@/features/project/api/projects";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import type { ProjectSummary } from "@/features/project/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  projects: ProjectSummary[];
};

/**
 * プロジェクトの一覧。1行がエディタへのリンクで、右端に削除ボタンを置く。
 *
 * タイトルだけが並んでいた頃は、どれがどれだか思い出すのに開くしかなかった。
 * 先頭シーンの隊形をサムネイルで見せ、シーン数・人数・通しの尺を添えることで、
 * 開く前に見分けが付くようにしている。
 *
 * 削除は「確定後更新」にしている(先にSupabaseの削除が成功してから
 * router.refresh()で一覧を取り直す)。プロジェクトの削除はcascadeで
 * シーン・ダンサー・位置まで巻き込む重い操作なので、楽観的に消して見せてから
 * 失敗で戻す(＝一瞬消えたものが復活する)より、確実に消えたことを確認して
 * から反映する方が納得しやすいため。
 *
 * ■ 改名は「先に見せて、失敗したら戻す」(削除とは逆。2026-08-17に追加)
 * 名前を書き換えるだけなら巻き添えが無く、押した直後に新しい名前が見えた方が
 * 手応えがある。**ここに改名が無かったので、名前を直すにはいちいち作品を
 * 開くしかなかった**(動作確認の台本は、一覧で直せる前提で書いてある)。
 * 一覧はServer Componentが取ってくるので、書き換えた名前は
 * router.refresh() が返ってくるまで手元(renamed)で覚えておく。
 */
export function ProjectList({ projects }: Props) {
  const t = useT();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** 改名したがまだ取り直せていない名前。id → 新しい名前 */
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const showToast = useUIStore((state) => state.showToast);

  const handleRename = async (project: ProjectSummary, next: string) => {
    setRenamed((current) => ({ ...current, [project.id]: next }));
    try {
      const supabase = createClient();
      await updateProjectTitle(supabase, project.id, next);
      router.refresh();
    } catch (caught) {
      // 元の名前へ戻す。取り直しの結果が入るまでの覚え書きなので、
      // 失敗したら覚えていること自体を消せばよい
      setRenamed((current) => {
        const { [project.id]: _reverted, ...rest } = current;
        void _reverted;
        return rest;
      });
      showToast({
        message: toUserMessage(caught, t.projects.renameFailed),
        type: "error",
      });
    }
  };

  const handleDelete = (project: ProjectSummary) => {
    requestConfirm({
      title: t.projects.deleteTitle(project.title),
      description:
        t.projects.deleteDescription,
      meta: [
        t.projects.deleteMetaScenes(project.sceneCount),
        t.projects.deleteMetaDancers(project.dancerCount),
        t.projects.deleteMetaPositions(
          project.sceneCount * project.dancerCount,
        ),
      ],
      onConfirm: async () => {
        setDeletingId(project.id);
        try {
          const supabase = createClient();
          await deleteProject(supabase, project.id);
          // 一覧はServer Componentが取得しているため、再取得させて反映する
          router.refresh();
        } catch (caught) {
          showToast({
            message: toUserMessage(caught, t.projects.deleteFailed),
            type: "error",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (projects.length === 0) {
    return <EmptyProjectList />;
  }

  return (
    <div className="flex flex-col gap-unit">
      {/* 字送りは段(text-caption)が持っている。ここだけ上書きすると、
          同じ見出しの文字間が画面ごとに変わる */}
      <p className="mx-base text-caption text-fg-muted">
        {t.projects.count(projects.length)}
      </p>
      {/* カードとカードの間は、カードの内側の余白と同じ幅にする。
          狭いと1枚の帯に見え、広いと関係が切れる */}
      <ul className="grid gap-gutter md:grid-cols-2">
        {projects.map((project) => (
          /* 【面はしっかり置く】(実機の報告 2026-08-20)。以前は surface
             (暗いテーマでは白4%)だけで、地の質感が透けて「カードが薄い」
             状態だった。1段上の面と1pxの縁で、板として立たせる */
          <li
            key={project.id}
            /* この画面でいちばん大きい塊。作るボタン(56px)やヘッダーと
               同じ高さで並ぶと、どれが主役か読めない(実機の報告
               2026-08-20)。ミニチュアを一回り大きくし、内側の余白も
               1段広げて、帯ではなく【板】として立たせる。

               面は `.card-surface`(globals.css)。**テーマによって
               半透明だったり不透明だったりする**面の色を、地の上へ
               重ねて必ず不透明にする — 質感が透けて文字が沈むため */
            className="card-surface flex items-center gap-gutter rounded-2xl border border-line-strong p-gutter transition-colors"
          >
            <Link
              href={`/projects/${project.id}`}
              className="shrink-0"
              aria-hidden
              tabIndex={-1}
            >
              <ProjectThumbnail project={project} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-unit">
              {/* 名前だけリンクの外に出す。中に鉛筆ボタンを入れると
                  「リンクの中のボタン」になり、押したときにどちらが
                  効くのかブラウザ任せになる */}
              <InlineEditableText
                value={renamed[project.id] ?? project.title}
                onCommit={(next) => void handleRename(project, next)}
                label={t.editor.projectName}
                href={`/projects/${project.id}`}
                textClassName="text-title"
                fullWidth
              />
              {/* シーン数・人数の点・通しの尺は出さない(実機の報告
                  2026-08-20)。**開く前に知りたいのは「どれか」**であって
                  数ではない。見分けるのはミニチュアと名前の役。

                  代わりに曲の名前を出す。**音源そのものは端末にしか
                  無い**ので、別の端末で開くと「名前は出るが鳴らない」
                  ことがある — それでも「どの曲で組んだ作品か」は
                  ここでしか分からない */}
              {project.musicTitle && (
                <Link
                  href={`/projects/${project.id}`}
                  className="flex min-w-0 items-center gap-base"
                >
                  <Music
                    size={13}
                    aria-hidden
                    className="shrink-0 text-accent-soft"
                  />
                  <span className="min-w-0 truncate text-caption text-fg-sub">
                    {project.musicTitle}
                  </span>
                </Link>
              )}
            </div>
            {/* 削除は赤い面にしない。赤いダンサーが隣に並ぶので、
                面が赤いと「危険」ではなく「誰かの色」に見える */}
            <PressableButton
              kind="icon"
              onClick={() => handleDelete(project)}
              disabled={deletingId === project.id}
              aria-label={t.projects.remove(project.title)}
              className="flex h-target w-target shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-40"
            >
              <Trash2 size={20} />
            </PressableButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 先頭シーンの隊形のミニチュア。まだシーンが無ければ破線で「シーン 0」 */
function ProjectThumbnail({ project }: { project: ProjectSummary }) {
  const t = useT();
  const aspectRatio = `${project.stageWidth} / ${project.stageHeight}`;

  if (project.sceneCount === 0) {
    return (
      <span
        aria-hidden
        className="flex w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-sunken font-mono text-mono-s text-fg-muted"
        style={{ aspectRatio }}
      >
        {t.projects.noScenes}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="relative block w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken"
      style={{ aspectRatio }}
    >
      <span
        className="absolute inset-0 block bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
        style={{
          backgroundSize: `${100 / project.stageWidth}% ${100 / project.stageHeight}%`,
        }}
      />
      {project.firstScenePositions.map((position, index) => (
        <span
          key={index}
          className="absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(position.xCoordinate / project.stageWidth) * 100}%`,
            top: `${(position.yCoordinate / project.stageHeight) * 100}%`,
            backgroundColor: themedDancerColor(position.color),
          }}
        />
      ))}
    </span>
  );
}

/**
 * 0件のとき。「ありません」だけで終わらせず、何をすれば始まるのかを書く。
 * 上の隊形イラストは、このアプリが何を作るものなのかの手がかりでもある。
 */
function EmptyProjectList() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-gutter rounded-2xl border border-dashed border-line-strong px-gutter py-gutter-lg text-center">
      <span
        aria-hidden
        className="relative block h-10 w-[110px] opacity-50"
      >
        {[
          { left: 6, top: 26, color: "var(--line-strong)" },
          { left: 30, top: 14, color: "var(--line-strong)" },
          { left: 54, top: 4, color: "var(--text-muted)" },
          { left: 78, top: 14, color: "var(--line-strong)" },
        ].map((dot) => (
          <span
            key={dot.left}
            className="absolute block h-[9px] w-[9px] rounded-full"
            style={{ left: dot.left, top: dot.top, backgroundColor: dot.color }}
          />
        ))}
      </span>
      {/* 文字は段から取る（text-sm / text-xs のような素の大きさを足すと、
          同じ役割の文字が画面ごとに少しずつ違う大きさになる）。
          末尾に <br /> が1つ残っていたので落とした */}
      <div className="flex flex-col gap-base">
        <p className="text-body leading-relaxed text-fg">{t.projects.empty}</p>
        <p className="text-label leading-relaxed text-fg-muted">
          {t.projects.emptyHint}
        </p>
      </div>
    </div>
  );
}
