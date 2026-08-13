"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareSheet } from "@/components/organisms/ShareSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Tooltip } from "@/components/atoms/Tooltip";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * 共有リンクの入口。ヘッダーに畳む(曲・診断と同じ扱い)。
 *
 * ■ 下書き(ゲスト)では出さない
 * 共有はサーバーに置いてある作品を、リンクを知っている人へ開くこと。
 * 端末の中にしか無い下書きには、そもそも配れる先が無い。
 * 押せないボタンを並べるより、保存を促すボタン(SaveToCloudButton)が
 * 既に隣にあるので、そちらへ任せる。
 *
 * ■ 共有中は色を持たせる
 * 「いま誰かに見えている」ことは、忘れていると困る種類の状態なので、
 * 閉じた入口のままでも分かるようにしておく。
 */
export function ShareButton({ project }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isGuest = useProjectStore((state) => state.isGuest);
  // 保存済みの値の置き場はstoreに一本化する(プロジェクト名と同じ考え方)
  const isShared = useProjectStore((state) =>
    state.project?.id === project.id ? state.project.isShared : project.isShared,
  );

  if (isGuest) return null;

  return (
    <>
      <Tooltip label="共有">
        <PressableButton
          kind="icon"
          aria-label={isShared ? "共有中。リンクを開く" : "共有"}
          onClick={() => setIsOpen(true)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.8333)] ${
            isShared ? "text-accent-soft" : "text-fg-sub"
          }`}
        >
          <Share2 size={17} />
        </PressableButton>
      </Tooltip>
      <ShareSheet
        project={project}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
