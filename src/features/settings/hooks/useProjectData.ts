"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  pendingWriteCount,
  persist,
} from "@/features/project/lib/persistence";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { deleteScene } from "@/features/scene/api/scenes";
import { deleteDancer } from "@/features/dancer/api/dancers";
import { saveGuestProject } from "@/features/project/api/saveGuestProject";
import {
  backupFileName,
  buildBackup,
  parseBackup,
  BackupFormatError,
} from "@/features/settings/lib/backup";
import type { Project } from "@/features/project/types";

/**
 * 設定の「データ」欄の3つ(書き出し・取り込み・初期化)。
 *
 * ■ 取り込みは【新しい作品として作る】
 * いま開いている作品を上書きしない。上書きにすると、取り込んだ側が
 * 間違いだったときに戻す手立てが無くなる。作り直された作品には
 * その場で移る(作ったのに見つからない、を起こさないため)。
 *
 * ■ 初期化はシーンとダンサーだけ
 * 作品そのもの(名前・ステージの広さ・曲の頭出し)は残す。作品ごと
 * 消したい場合の入口は一覧側にあり、そちらとは別の操作にしてある。
 */
export function useProjectData(project: Project) {
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const [isBusy, setIsBusy] = useState(false);
  /** 取り込み用の <input type="file">。画面には出さない */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const { dancers, scenes, positionsBySceneId } = useProjectStore.getState();
    const exportedAt = new Date().toISOString();
    const backup = buildBackup({
      project,
      dancers: Object.values(dancers),
      scenes,
      positions: scenes.flatMap((scene) =>
        Object.values(positionsBySceneId[scene.id] ?? {}),
      ),
      exportedAt,
    });

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName(project.title, exportedAt);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setIsBusy(true);
    try {
      const backup = parseBackup(await file.text());
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインしてから取り込んでください");

      const now = new Date().toISOString();
      const created = await saveGuestProject(supabase, user.id, {
        project: {
          ...backup.project,
          // idと持ち主は saveGuestProject が採り直す。ここは通す値の形を
          // 揃えるためだけに入れている
          id: "",
          userId: user.id,
          shareToken: null,
          isShared: false,
          createdAt: now,
          updatedAt: now,
        },
        dancers: backup.dancers.map((dancer) => ({
          ...dancer,
          projectId: "",
          createdAt: now,
        })),
        scenes: backup.scenes.map((scene) => ({ ...scene, projectId: "" })),
        positions: backup.positions,
      });

      showToast({ message: "取り込みました", type: "success" });
      router.push(`/projects/${created.id}`);
      router.refresh();
    } catch (error) {
      showToast({
        message:
          error instanceof BackupFormatError
            ? error.message
            : toUserMessage(error, "取り込めませんでした"),
        type: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = () => fileInputRef.current?.click();

  const handleResetProject = () => {
    const { scenes, dancers } = useProjectStore.getState();
    requestConfirm({
      title: "この作品を空にしますか",
      description:
        "シーンとダンサーを全部消します。作品そのもの(名前・ステージの広さ・曲の頭出し)は残ります。取り消せません。",
      meta: [`${scenes.length} シーン`, `${Object.keys(dancers).length} 人`],
      confirmLabel: "空にする",
      onConfirm: async () => {
        setIsBusy(true);
        const sceneIds = scenes.map((scene) => scene.id);
        const dancerIds = Object.keys(dancers);
        try {
          await persist(async (supabase) => {
            // 配置は scenes / dancers の外部キーに cascade で付いて消える
            for (const id of sceneIds) await deleteScene(supabase, id);
            for (const id of dancerIds) await deleteDancer(supabase, id);
          });
          useProjectStore
            .getState()
            .hydrate({ project, dancers: [], scenes: [], positions: [] });
          // 自動保存を切っていると、消す指示はまだ送られていない。
          // hydrate が未保存の印を落とすので、貯まっていれば立て直す
          if (pendingWriteCount() > 0) {
            useProjectStore.getState().markUnsaved();
          }
          useUIStore.getState().selectScene(null);
          useUIStore.getState().selectDancer(null);
          router.refresh();
        } catch (error) {
          showToast({
            message: toUserMessage(error, "空にできませんでした"),
            type: "error",
          });
        } finally {
          setIsBusy(false);
        }
      },
    });
  };

  return {
    isBusy,
    fileInputRef,
    handleExport,
    handleImport,
    handleImportFile,
    handleResetProject,
  };
}
