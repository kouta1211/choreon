"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createProject } from "@/features/project/api/projects";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { PressableButton } from "@/components/atoms/PressableButton";
import { TextField } from "@/components/atoms/TextField";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  userId: string;
};

export function CreateProjectForm({ userId }: Props) {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useUIStore((state) => state.showToast);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      // ステージの広さと速さは設定の初期値から。作った後は作品側が正で、
      // 設定を変えても既にある作品は動かない
      const settings = useSettingsStore.getState();
      const project = await createProject(supabase, userId, title, {
        stageWidth: settings.defaultStageWidth,
        stageHeight: settings.defaultStageHeight,
        bpm: settings.defaultBpm,
      });

      // 同じ名前があると createProject が (2) を足す。黙って変えると
      // 「打った名前と違う」が不具合に見えるので、移る前に断っておく
      // (トーストはストアに載っているので、移動先の画面で出る)
      if (project.title !== title.trim()) {
        showToast({
          message: t.projects.renamedForClash(project.title),
          type: "success",
        });
      }
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.projects.createFailed),
        type: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-unit">
      <div className="flex-1">
        <TextField
          label={t.projects.newName}
          isLabelVisible={false}
          size="lg"
          type="text"
          required
          placeholder={t.projects.newName}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <PressableButton
        kind="primary"
        type="submit"
        disabled={isSubmitting || !title.trim()}
        aria-label={t.projects.create}
        className="flex h-target-lg w-target-lg shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg disabled:opacity-50"
      >
        <Plus size={24} />
      </PressableButton>
    </form>
  );
}
