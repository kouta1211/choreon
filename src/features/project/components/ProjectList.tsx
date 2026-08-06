import Link from "next/link";
import type { Project } from "@/features/project/types";

type Props = {
  projects: Project[];
};

export function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        まだプロジェクトがありません。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="block rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 shadow-sm transition-colors hover:border-pink-800 hover:bg-zinc-800"
          >
            {project.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
