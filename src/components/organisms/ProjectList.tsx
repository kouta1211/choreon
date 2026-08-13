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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const showToast = useUIStore((state) => state.showToast);

  const handleDelete = (project: ProjectSummary) => {
    requestConfirm({
      title: `「${project.title}」を削除しますか?`,
      description:
        "このプロジェクトのシーン・ダンサー・配置がすべて消えます。削除は元に戻せません。",
      meta: [
        `${project.sceneCount} シーン`,
        `${project.dancerCount} 人`,
        `${project.sceneCount * project.dancerCount} 配置`,
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
            message: toUserMessage(caught, "プロジェクトの削除に失敗しました"),
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
    <div className="space-y-2.5">
      <p className="mx-0.5 text-[10px] font-semibold tracking-[0.14em] text-fg-muted">
        プロジェクト {projects.length}件
      </p>
      <ul className="grid gap-2.5 md:grid-cols-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center gap-2.5 rounded-[calc(var(--radius)*1.1667)] border border-line bg-surface p-3"
          >
            <Link
              href={`/projects/${project.id}`}
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <ProjectThumbnail project={project} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-fg-strong">
                  {project.title}
                </span>
                <span className="mt-1.5 block font-mono text-[11px] font-medium text-fg-sub">
                  {project.sceneCount} シーン · {project.dancerCount} 人
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
                  <span className="mt-2 flex gap-1">
                    {project.dancerColors.map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        aria-hidden
                        className="block h-2 w-2 rounded-full"
                        style={{ backgroundColor: themedDancerColor(color) }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="mt-2 block text-[11px] text-fg-muted">
                    タップして最初のシーンを作る
                  </span>
                )}
              </span>
            </Link>
            <PressableButton
              kind="icon"
              onClick={() => handleDelete(project)}
              disabled={deletingId === project.id}
              aria-label={`${project.title}を削除`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.9167)] text-fg-muted hover:bg-red-950 hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 size={17} />
            </PressableButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 先頭シーンの隊形のミニチュア。まだシーンが無ければ破線で「シーン 0」 */
function ProjectThumbnail({ project }: { project: ProjectSummary }) {
  const aspectRatio = `${project.stageWidth} / ${project.stageHeight}`;

  if (project.sceneCount === 0) {
    return (
      <span
        aria-hidden
        className="flex w-[84px] shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-sunken font-mono text-[9px] text-fg-muted"
        style={{ aspectRatio }}
      >
        シーン 0
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="relative block w-[84px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken"
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
        まだプロジェクトがありません。
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
        上の入力から曲名を入れると、
        <br />
        ステージが1つ立ち上がります。
      </p>
    </div>
  );
}
