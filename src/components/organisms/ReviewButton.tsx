"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ReviewSheet } from "@/components/organisms/ReviewSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Tooltip } from "@/components/atoms/Tooltip";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
};

/**
 * 隊形を見てもらう入口。曲やテーマと同じくヘッダーに畳む。
 *
 * ドックではなくここに置いたのは、ドックが「今どこにいるか」を見る場所
 * だから。診断は頼んだときだけ動くもので、常に見ているものではない。
 */
export function ReviewButton({ project }: Props) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip label={t.review.title}>
        <PressableButton
          kind="icon"
          aria-label={t.review.title}
          onClick={() => setIsOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.8333)] text-fg-sub"
        >
          <Sparkles size={17} />
        </PressableButton>
      </Tooltip>
      <ReviewSheet
        project={project}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
