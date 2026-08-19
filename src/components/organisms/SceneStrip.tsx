"use client";

import { useEffect, useRef } from "react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { useT } from "@/features/i18n/LocaleProvider";
import type { Project } from "@/features/project/types";

/** コマの幅。時間軸のコマと同じ見え方になるように合わせてある */
const CARD_WIDTH_PX = 74;

type Props = {
  project: Project;
};

/**
 * シーンを【等間隔】に並べる帯。時間軸の代わりに出す。
 *
 * ■ なぜ2つあるのか
 * 時間軸（MusicTimeline）は横位置がそのまま時刻で、間隔がそのまま移動時間に
 * なる。曲や拍という物差しがあるときは、これが読み方として正しい。
 *
 * ただし物差しが1つも無いと、**時刻が近いシーンのコマが重なって押せなく
 * なる**だけで、得るものが無い（実機の報告 2026-08-19）。そのときは
 * 「何秒目か」を捨てて、順番と「何秒で動くか」だけを出す。
 * どちらを出すかは `useOrderOnlyTimeline` が決める。
 *
 * ■ 移動時間はコマとコマの間に出す
 * コマの中に書くと「このシーンが何秒か」に読めるが、実際は
 * **前のシーンからここへ来るのにかかる時間**で、区間の値。
 * 区間の場所に置けば、読み違えようが無い。
 */
export function SceneStrip({ project }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const { selectSceneManually } = useSceneActions();

  const durations = sceneDurations(scenes);
  const selectedRef = useRef<HTMLLIElement>(null);

  /* 選んでいるコマを見える所へ。シーンが増えると帯からはみ出すので、
     一覧やキーボードで飛んだときに画面の外のままになる */
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedSceneId]);

  if (scenes.length === 0) return null;

  return (
    <ol
      data-testid="scene-strip"
      className="flex items-end gap-1 overflow-x-auto px-0.5 pb-1"
    >
      {scenes.map((scene, index) => {
        const isSelected = scene.id === selectedSceneId;
        return (
          <li
            key={scene.id}
            ref={isSelected ? selectedRef : undefined}
            className="flex shrink-0 items-end gap-1"
          >
            {/* 区間の秒数。先頭には入ってくる元が無い */}
            {index > 0 && (
              <span className="shrink-0 pb-6 font-mono text-caption whitespace-nowrap text-fg-muted">
                {t.editor.scenes.segment(durations[index])}
              </span>
            )}
            <SceneThumbnail
              scene={scene}
              thumbnail={thumbnailBySceneId[scene.id]}
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
              isSelected={isSelected}
              onClick={() => selectSceneManually(scene.id)}
              index={index + 1}
              sizePx={CARD_WIDTH_PX}
              showLabel
            />
          </li>
        );
      })}
    </ol>
  );
}
