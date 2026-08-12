"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { buildFormationSummary } from "@/features/review/lib/formationSummary";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * いま見ている隊形を、AIに一度だけ見てもらう。
 *
 * ■ 押したときだけ送る
 * 触るたびに送ると、料金も待ち時間も積み上がる。それ以上に、
 * 頼んでいない講評が出続けるのは邪魔になる。
 *
 * ■ 判定ではなく材料
 * 振付に正解は無いので、「直すべき」ではなく「こうすると こうなる」を
 * 返させている(プロンプトは /api/review にある)。数字はアプリが
 * 計算したものだけを渡し、AIには数えさせない。
 */
export function ReviewSheet({ project, isOpen, onClose }: Props) {
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;

  const run = async () => {
    if (!scene) return;
    setIsRunning(true);
    setError(null);
    setText(null);

    try {
      const summary = buildFormationSummary({
        scene,
        previousScene: scenes[index - 1] ?? null,
        nextScene: scenes[index + 1] ?? null,
        dancers,
        positions: positionsBySceneId[scene.id] ?? {},
        nextPositions: scenes[index + 1]
          ? (positionsBySceneId[scenes[index + 1].id] ?? {})
          : {},
        stageWidth: project.stageWidth,
        stageHeight: project.stageHeight,
      });

      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !data.text) {
        setError(data.error ?? "診断が取れませんでした");
        return;
      }
      setText(data.text);
    } catch {
      setError("通信できませんでした");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="隊形を見てもらう"
      titleRight={scene?.name}
    >
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <p className="text-[12px] leading-[1.65] text-fg-sub">
          いま開いているシーンの立ち位置だけを送ります。作品名やダンサーの色は
          送りません。返ってくるのは判定ではなく、考えるための材料です。
        </p>

        {text && (
          <div className="rounded-[calc(var(--radius)*0.8)] border border-line-strong bg-surface-sunken p-3 text-[12.5px] leading-[1.75] whitespace-pre-wrap text-fg">
            {text}
          </div>
        )}

        {error && (
          <p className="rounded-[calc(var(--radius)*0.8)] bg-fg/5 p-3 text-[12px] text-fg-sub">
            {error}
          </p>
        )}

        <PressableButton
          kind="primary"
          onClick={() => void run()}
          disabled={isRunning || !scene}
          className="flex h-11 items-center justify-center gap-1.5 rounded-[calc(var(--radius)*0.9)] bg-accent text-[13px] font-semibold text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.22)] disabled:opacity-50"
        >
          <Sparkles size={15} />
          {isRunning ? "見てもらっています..." : text ? "もう一度" : "見てもらう"}
        </PressableButton>
      </div>
    </BottomSheet>
  );
}
