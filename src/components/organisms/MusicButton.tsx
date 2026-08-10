"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import { MusicSheet } from "@/components/organisms/MusicSheet";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { Tooltip } from "@/components/atoms/Tooltip";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * 曲を選ぶ入口。エディタのヘッダーに置く。
 *
 * ドックではなくここに置いたのは、ドックが「今どこにいるか」を見る場所
 * だから。曲の設定は一度決めれば毎回触るものではないので、シートに畳んで
 * 高さを返している(見た目の設定やテンプレートと同じ扱い)。
 *
 * 曲が入っているときはボタン自体を強調して、いま音が付いていることを
 * 開かずに分かるようにする。
 */
export function MusicButton({ project }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);

  return (
    <>
      <Tooltip label="曲">
        <button
          type="button"
          aria-label="曲"
          aria-pressed={hasMusic}
          onClick={() => setIsOpen(true)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.8333)] ${
            hasMusic
              ? "border border-accent bg-accent/12 text-accent-soft"
              : "text-fg-sub"
          }`}
        >
          <Music size={17} />
        </button>
      </Tooltip>
      <MusicSheet
        project={project}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
