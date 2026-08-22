"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createProject } from "@/features/project/api/projects";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { TextField } from "@/components/atoms/TextField";
import { SettingsNumberRow } from "@/components/molecules/SettingsRow";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import {
  DEFAULT_STAGE_HEIGHT,
  DEFAULT_STAGE_WIDTH,
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
} from "@/features/settings/lib/settings";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  userId: string;
};

/**
 * 作品を作る入口。**ボタン1つ**で、押すと初期設定の板が開く。
 *
 * ■ なぜ入力欄を出しっぱなしにしないのか(2026-08-20)
 * 以前は「名前の欄＋＋のボタン」が一覧の上に常に出ていた。作るのは
 * たまにしかしないのに、画面のいちばん目立つ所を常時1行使っていたうえ、
 * **名前しか決められなかった**（広さは設定の初期値のまま作られる）。
 * 押してから決める形にすると、その場で広さまで決められる。
 *
 * ■ 開いているかどうかは、ここが持つ
 * 開ける場所がここ1箇所しかないので、ストアへは出さない
 * （AuthDialog は複数の場所から開くのでストアに置いてある）。
 */
export function NewProjectButton({ userId }: Props) {
  const t = useT();
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const defaultBpm = useSettingsStore((state) => state.defaultBpm);

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [stageWidth, setStageWidth] = useState(DEFAULT_STAGE_WIDTH);
  const [stageHeight, setStageHeight] = useState(DEFAULT_STAGE_HEIGHT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* 開くたびに、決まった出発点から始め直す。前に開いたときの数字が
     残っていると、「前の作品の広さ」を引きずったように見える */
  const open = () => {
    setTitle("");
    setStageWidth(DEFAULT_STAGE_WIDTH);
    setStageHeight(DEFAULT_STAGE_HEIGHT);
    setIsOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim() === "") return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      // 速さ(BPM)は設定の初期値のまま。作った後は作品側が正で、
      // 設定を変えても既にある作品は動かない
      const project = await createProject(supabase, userId, title, {
        stageWidth,
        stageHeight,
        bpm: defaultBpm,
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
    <>
      <PressableButton
        kind="primary"
        onClick={open}
        className="flex h-target-lg w-full items-center justify-center gap-unit rounded-lg bg-accent text-headline text-accent-fg"
      >
        <Plus size={20} />
        {t.projects.create}
      </PressableButton>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t.projects.newTitle}
        wideMaxWidthClassName="min-[1200px]:max-w-md"
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-gutter px-gutter pt-base pb-gutter"
        >
          <TextField
            label={t.projects.newName}
            autoFocus
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          {/* 広さは【この作品のもの】。ここで決めた値がそのまま入り、
              設定の初期値は次に作るときの出発点として残る。

              **ここだけ「適用」を出さない**（commitOn="blur"、実機の報告
              2026-08-22）。設定 → 舞台で押させているのは、幅を縮めると
              **すでに置いてある人が端へ寄る**からで、ここにはまだ誰も
              居ない。確定は下の「プロジェクトを作成」が担っているので、
              行ごとの適用は押す意味が無いまま手数だけ増やしていた */}
          <div className="flex flex-col rounded-xl border border-line">
            <SettingsNumberRow
              label={t.settings.stage.width}
              value={stageWidth}
              min={MIN_STAGE_UNITS}
              max={MAX_STAGE_UNITS}
              unit={t.settings.stage.unit}
              onChange={setStageWidth}
              commitOn="blur"
            />
            <SettingsNumberRow
              label={t.settings.stage.depth}
              description={t.settings.stage.depthDescription}
              value={stageHeight}
              min={MIN_STAGE_UNITS}
              max={MAX_STAGE_UNITS}
              unit={t.settings.stage.unit}
              onChange={setStageHeight}
              commitOn="blur"
            />
          </div>

          <PressableButton
            kind="primary"
            type="submit"
            disabled={isSubmitting || title.trim() === ""}
            className="flex h-target-lg w-full items-center justify-center rounded-lg bg-accent text-headline text-accent-fg disabled:opacity-50"
          >
            {t.projects.create}
          </PressableButton>
        </form>
      </BottomSheet>
    </>
  );
}
