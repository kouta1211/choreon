"use client";

import { useState } from "react";
import {
  SettingsGroup,
  SettingsNumberRow,
  SettingsSwitchRow,
} from "@/components/molecules/SettingsRow";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateStageSize } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import {
  MAX_STAGE_UNITS,
  MIN_STAGE_UNITS,
} from "@/features/settings/lib/settings";
import {
  dancersOutside,
  smallestStage,
} from "@/features/project/lib/stageResize";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 設定の「舞台」。客席の向きと、ステージの広さ。
 *
 * ■ 広さが指す先は、どこから開いたかで変わる(2026-08-18、実機報告 03-17)
 * ホームから開いたら【これから作る作品の初期値】、作品を開いた状態なら
 * 【その作品の広さ】。以前は2つの束に分けて両方見せていたが、
 * **同じ画面に「幅」が2つ並ぶ**ことになり、どちらが効くのか読めなかった。
 * いま見ている作品の広さを変えたい人にとって、初期値の欄はただの罠になる。
 *
 * 束ごとに部品を分けて、**その束が要る値だけをストアから読む**。
 * 親(SettingsSheet)がまとめて読んで配ると、設定を1つ変えるだけで
 * シート全体が描き直される。
 */
export function SettingsStageSection() {
  const hasProject = useProjectStore((state) => state.project !== null);
  return hasProject ? <ProjectStage /> : <DefaultStage />;
}

/** 客席の向き。作品を開いていてもいなくても同じ話なので、両方に出す */
function AudienceRow() {
  const t = useT();
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsSwitchRow
      label={t.settings.stage.audienceOnTop.label}
      description={t.settings.stage.audienceOnTop.description}
      checked={isAudienceOnTop}
      onChange={() => update("isAudienceOnTop", !isAudienceOnTop)}
    />
  );
}

/**
 * ホームから開いたとき。広さは【これから作る作品】の初期値で、
 * 既にある作品には効かない。
 */
function DefaultStage() {
  const t = useT();
  const defaultStageWidth = useSettingsStore(
    (state) => state.defaultStageWidth,
  );
  const defaultStageHeight = useSettingsStore(
    (state) => state.defaultStageHeight,
  );
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsGroup description={t.settings.stage.description}>
      <AudienceRow />
      <SettingsNumberRow
        label={t.settings.stage.width}
        value={defaultStageWidth}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => update("defaultStageWidth", value)}
      />
      <SettingsNumberRow
        label={t.settings.stage.depth}
        description={t.settings.stage.depthDescription}
        value={defaultStageHeight}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => update("defaultStageHeight", value)}
      />
    </SettingsGroup>
  );
}

/**
 * 作品を開いているとき。広さは**その作品のもの**で、変えるとステージが
 * その場で広がる。
 *
 * ■ 狭めて人が外に出るときは、止める
 * 立ち位置はマス目で持っているので、狭めれば外の人は消えるか端へ寄せ直す
 * しかない。どちらも**組んだ隊形を勝手に崩す**。「◯人がその外に居ます」と
 * 言って止め、動かすかどうかは user に決めてもらう(判断は stageResize.ts)。
 */
function ProjectStage() {
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

  /**
   * 片方の軸だけを差し替えて確定する。受け取らなかったら false を返す
   * (欄の数も元へ戻る)。
   *
   * **その場の値を読み直している。** 幅と奥行きの両方を打ってから
   * 下の「適用」を押すと、2つの確定が同じ瞬間に走る。描画したときの
   * 写しを見ていると、後から走った方が先の変更を消してしまう。
   */
  const apply = (next: { width?: number; height?: number }) => {
    const store = useProjectStore.getState();
    const current = store.project;
    if (!current) return false;

    const width = next.width ?? current.stageWidth;
    const height = next.height ?? current.stageHeight;

    const outside = dancersOutside(store.positionsBySceneId, width, height);
    if (outside.count > 0) {
      // **押しても変わらないのではなく、変えない理由を出す**
      setBlocked(outside.count);
      return false;
    }
    setBlocked(null);

    const before = { width: current.stageWidth, height: current.stageHeight };
    setStageSize(width, height);

    void persist((supabase) =>
      updateStageSize(supabase, current.id, width, height),
    ).catch((caught: unknown) => {
      // 楽観的に見せたぶんを戻す。保存できていないのに広く見えるのが最悪。
      // 戻すのは**この呼び出しが触った軸だけ**(もう片方は別の書き込みの結果)
      const now = useProjectStore.getState().project;
      if (now) {
        setStageSize(
          next.width === undefined ? now.stageWidth : before.width,
          next.height === undefined ? now.stageHeight : before.height,
        );
      }
      showToast({
        message: toUserMessage(caught, t.settings.projectStage.failed),
        type: "error",
      });
    });

    return true;
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
      <AudienceRow />
      <SettingsNumberRow
        label={t.settings.stage.width}
        value={project.stageWidth}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => apply({ width: value })}
      />
      <SettingsNumberRow
        label={t.settings.stage.depth}
        value={project.stageHeight}
        min={MIN_STAGE_UNITS}
        max={MAX_STAGE_UNITS}
        unit={t.settings.stage.unit}
        onChange={(value) => apply({ height: value })}
      />
    </SettingsGroup>
  );
}
