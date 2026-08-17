"use client";

import { useState } from "react";
import {
  SettingsGroup,
  SettingsNumberRow,
} from "@/components/molecules/SettingsRow";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateStageSize } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
} from "@/features/settings/lib/settings";
import { dancersOutside, smallestStage } from "@/features/project/lib/stageResize";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「舞台」のうち、**いま開いている作品**のステージの広さ。
 *
 * ■ なぜ足したのか(2026-08-18、実機報告 03-10)
 * 「ステージの縦横の幅が変更できてない」。そのとおりだった —
 * `stage_width` は**作るときにしか書いていなかった**。すぐ上に並んでいる
 * 「ステージの幅」は新しく作る作品の初期値で、開いている作品には効かない。
 * 名前が同じなので、効かないことに気づけない作りだった。
 *
 * ■ 狭めて人が外に出るときは、止める
 * 立ち位置はマス目で持っているので、狭めれば外の人は消えるか端へ寄せ直す
 * しかない。どちらも**組んだ隊形を勝手に崩す**。「◯人がその外に居ます」と
 * 言って止め、動かすかどうかは user に決めてもらう（判断は stageResize.ts）。
 */
export function SettingsProjectStageSection() {
  const t = useT();
  const project = useProjectStore((state) => state.project);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const setStageSize = useProjectStore((state) => state.setStageSize);
  const showToast = useUIStore((state) => state.showToast);
  const [blocked, setBlocked] = useState<number | null>(null);

  if (!project) return null;

  const floor = smallestStage(positionsBySceneId);

  const apply = async (width: number, height: number) => {
    const outside = dancersOutside(positionsBySceneId, width, height);
    if (outside.count > 0) {
      // **押しても変わらないのではなく、変えない理由を出す**
      setBlocked(outside.count);
      return;
    }
    setBlocked(null);

    const before = { width: project.stageWidth, height: project.stageHeight };
    setStageSize(width, height);
    try {
      await persist((supabase) =>
        updateStageSize(supabase, project.id, width, height),
      );
    } catch (caught) {
      // 楽観的に見せたぶんを戻す。保存できていないのに広く見えるのが最悪
      setStageSize(before.width, before.height);
      showToast({
        message: toUserMessage(caught, t.settings.projectStage.failed),
        type: "error",
      });
    }
  };

  return (
    <SettingsGroup
      description={
        blocked !== null
          ? t.settings.projectStage.hasOutside(blocked)
          : floor
            ? t.settings.projectStage.floor(floor.width, floor.height)
            : t.settings.projectStage.description
      }
    >
      <SettingsNumberRow
        label={t.settings.projectStage.width}
        value={project.stageWidth}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => void apply(value, project.stageHeight)}
      />
      <SettingsNumberRow
        label={t.settings.projectStage.depth}
        value={project.stageHeight}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => void apply(project.stageWidth, value)}
      />
    </SettingsGroup>
  );
}
