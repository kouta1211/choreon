"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { deleteProject } from "@/features/project/api/projects";
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
 */
export function ProjectList({ projects }: Props) {
  const t = useT();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const showToast = useUIStore((state) => state.showToast);

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
      <p className="mx-base text-caption tracking-[0.14em] text-fg-muted">
        {t.projects.count(projects.length)}
      </p>
      <ul className="grid gap-unit md:grid-cols-2">
        {projects.map((project) => (
          /* 面は surface-1。枠線を持たせず、地との明度差だけで浮かせる
             (押せることは面の変化で示す) */
          <li
            key={project.id}
            className="flex items-center gap-gutter rounded-2xl bg-surface p-unit transition-colors hover:bg-surface-raised"
          >
            <Link
              href={`/projects/${project.id}`}
              className="flex min-w-0 flex-1 items-center gap-gutter"
            >
              <ProjectThumbnail project={project} />
              <span className="flex min-w-0 flex-1 flex-col gap-base">
                <span className="truncate text-title text-fg-strong">
                  {project.title}
                </span>
                <span className="font-mono text-mono-s text-fg-sub">
                  {t.projects.cardSummary(
                    project.sceneCount,
                    project.dancerCount,
                  )}
                  {project.sceneCount > 1 && (
                    <>
                      {" · "}
                      <span className="text-accent-soft">
                        {project.totalSeconds}s
                      </span>
                    </>
                  )}
                </span>
                {project.dancerColors.length > 0 ? (
                  <span className="flex gap-base">
                    {project.dancerColors.map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        aria-hidden
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: themedDancerColor(color) }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="text-caption text-fg-muted">
                    {t.projects.tapToStart}
                  </span>
                )}
              </span>
            </Link>
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
        className="flex w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-sunken font-mono text-mono-s text-fg-muted"
        style={{ aspectRatio }}
      >
        {t.projects.noScenes}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="relative block w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken"
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
    <div className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-center">
      <span
        aria-hidden
        className="relative mx-auto mb-3.5 block h-10 w-[110px] opacity-50"
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
      <p className="text-sm leading-relaxed font-medium text-fg">
        {t.projects.empty}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
        {t.projects.emptyHint}
        <br />

      </p>
    </div>
  );
}
