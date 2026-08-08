"use client";

import { useState } from "react";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { updateProjectTitle } from "@/features/project/api/projects";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * エディタ画面のプロジェクト名。押すとその場で入力欄に変わり、名前を変更できる。
 *
 * 表示中の名前はstoreから読む。以前はここのuseStateだけで持っていたが、
 * 未ログインの下書き(ゲストモード)をあとからクラウドへ保存するとき、
 * 変更後の名前がstoreに無いと古い名前で保存されてしまうため、
 * シーン名・ダンサー名と同じくstoreを唯一の置き場にした。
 *
 * storeはマウント後のeffectで満たされるので、それまではprops(サーバーが
 * 取得した値)を使う。更新は楽観的更新(先に反映し、保存に失敗したら戻す)。
 */
export function ProjectTitle({ project }: Props) {
  // 別プロジェクトのstoreが残っている一瞬に他人の名前を出さないよう、
  // idが一致するときだけstoreの値を使う。storeが未読込のあいだ(初回描画や、
  // この部品だけを単体で置いたとき)は手元のstateで表示を成立させる
  const storedTitle = useProjectStore((state) =>
    state.project?.id === project.id ? state.project.title : null,
  );
  const [localTitle, setLocalTitle] = useState(project.title);
  const title = storedTitle ?? localTitle;
  const renameProject = useProjectStore((state) => state.renameProject);
  const showToast = useUIStore((state) => state.showToast);

  const commit = async (next: string) => {
    const previous = title;
    setLocalTitle(next);
    renameProject(next);

    try {
      await persist((supabase) =>
        updateProjectTitle(supabase, project.id, next),
      );
    } catch (error) {
      setLocalTitle(previous);
      renameProject(previous);
      showToast({
        message: toUserMessage(error, "プロジェクト名の変更に失敗しました"),
        type: "error",
      });
    }
  };

  return (
    <InlineEditableText
      value={title}
      onCommit={commit}
      label="プロジェクト名"
      textClassName="text-[15px] font-semibold"
      fullWidth
    />
  );
}
