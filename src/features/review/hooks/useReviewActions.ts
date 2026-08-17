"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useClearBlindSpot } from "@/features/canvas/hooks/useClearBlindSpot";
import { useExtendMoveTime } from "@/features/canvas/hooks/useExtendMoveTime";
import { useApplyTemplate } from "@/features/canvas/hooks/useApplyTemplate";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import {
  DEFAULT_TRANSFORM,
  templatesForCount,
  type FormationTemplate,
} from "@/features/canvas/lib/formationTemplates";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { formationName } from "@/features/i18n/lib/formationName";
import type { ReviewFinding } from "@/features/review/lib/reviewFindings";
import { useT } from "@/features/i18n/LocaleProvider";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";

/**
 * 見てもらった指摘1件に対して、**いま何ができるか**を決める。
 *
 * ■ なぜ画面から出したのか（2026-08-18）
 * この判断には機能の約束が全部入っている —
 *   ・直しは**いまの隊形**で成り立つときだけ出す
 *   ・当てる先は**指摘が指しているシーン**（開いているシーンではない）
 *   ・同じ名前が2人いるときは当てない
 *   ・図は**アプリが持っている隊形**からしか描かない
 * それが ReviewSheet の中にあったので、**確かめるには画面を描くしかなかった**。
 * ここへ出すと、押す前の判断そのものを直接試せる。
 *
 * 挙動は変えていない。移したのは置き場所だけ。
 */

/** 押すと当たる直し。**押されるまで何も起きない** */
export type ReviewAction = { label: string; run: () => Promise<void> | void };

/** 「こう並べると」の図に要るもの。点の位置はアプリが持っている */
export type ReviewFormation = {
  template: FormationTemplate;
  dancerCount: number;
  dancerColors: string[];
  name: string;
  apply: () => Promise<void>;
};

export function useReviewActions(project: Project) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);

  const { suggestFor, extendTo } = useExtendMoveTime();
  const { suggestXFor, moveOut } = useClearBlindSpot();
  const { applyTemplate } = useApplyTemplate(project);

  const openedScene =
    scenes.find((scene) => scene.id === selectedSceneId) ?? null;

  /**
   * 名前 → ID。
   *
   * AI へ ID は送っていない(送らない約束)ので、返ってくるのは名前だけ。
   * **同じ名前が2人いるときは当てない** — どちらを動かすか決められない
   * まま片方を動かすのは、当たらない直しより悪い。
   */
  const idForName = (name: string): string | null => {
    const matches = Object.values(dancers).filter(
      (dancer) => dancer.name === name,
    );
    return matches.length === 1 ? matches[0].id : null;
  };

  /**
   * その指摘が指しているシーン。
   *
   * 作品ぜんぶのときは返事の番号（1から）で、このシーンのときはいま開いて
   * いるシーン。**番号は画面左の 01 / 02 と同じ並び順**にしてある。
   */
  const sceneFor = (finding: ReviewFinding): Scene | null =>
    finding.sceneNumber
      ? (scenes[finding.sceneNumber - 1] ?? null)
      : openedScene;

  /**
   * 直しのボタンを1件ぶん作る。作らない（undefined）こともある。
   *
   * ここが**いまの隊形**を見ている点が要点。返事を待っている間に user が
   * 自分で直していれば、速すぎる移動も顔被りも消えているので、
   * ボタンは出ない。返ってきた時点の状態でボタンを出すと、
   * 押しても何も起きない／別の場所が動く、になる。
   *
   * 作品ぜんぶのときは、**指摘が指しているシーンへ当てる**（いま開いて
   * いるシーンではない）。ここを取り違えると、関係の無い場面が動く。
   */
  const actionFor = (finding: ReviewFinding): ReviewAction | undefined => {
    if (!finding.fix) return undefined;
    const target = sceneFor(finding);
    if (!target) return undefined;
    const dancerId = idForName(finding.fix.dancerName);
    if (!dancerId) return undefined;

    if (finding.fix.kind === "clearBlindSpot") {
      if (suggestXFor(dancerId, target.id) === null) return undefined;
      return {
        label: t.dancer.badges.blindSpot.moveOut,
        run: () => moveOut(dancerId, target.id),
      };
    }

    // retime: 何秒に延ばすかはアプリが計算する
    const targetIndex = scenes.findIndex((item) => item.id === target.id);
    const nextScene = scenes[targetIndex + 1] ?? null;
    if (!nextScene) return undefined;
    const segmentSeconds = nextScene.timeSeconds - target.timeSeconds;
    if (segmentSeconds <= 0) return undefined;

    const strain = findExcessiveMoves(
      positionsBySceneId[target.id] ?? {},
      positionsBySceneId[nextScene.id] ?? {},
      segmentSeconds,
    ).get(dancerId);
    if (!strain) return undefined;
    const seconds = suggestFor(strain, target.id);
    if (seconds === null) return undefined;
    return {
      label: t.dancer.badges.excessiveMove.extend(seconds),
      run: () => extendTo(seconds, target.id),
    };
  };

  /**
   * 「こう並べると」の図。
   *
   * ■ 名前だけでは並びが読めない
   * 「V字（後1-3-4前）」と言われても、どんな形なのか目に浮かばない。
   * **点の位置はアプリが持っている**（FORMATION_TEMPLATES）ので、
   * AI が選んだ名前から図を描く。AI に形を作らせてはいない。
   *
   * ■ 当てる先は、その指摘のシーン
   * 作品ぜんぶのときは別のシーンの話になる。開いていないシーンへ当てる
   * のは分かりにくいので、**そのシーンを開いてから**当てる。
   */
  const formationFor = (finding: ReviewFinding): ReviewFormation | null => {
    if (!finding.formationShape) return null;
    const target = sceneFor(finding);
    if (!target) return null;

    const onStage = Object.values(positionsBySceneId[target.id] ?? {});
    if (onStage.length === 0) return null;

    const template = templatesForCount(onStage.length).find(
      (item) => item.label.shape === finding.formationShape,
    );
    if (!template) return null;

    return {
      template,
      dancerCount: onStage.length,
      dancerColors: onStage.map((position) =>
        themedDancerColor(dancers[position.dancerId]?.color ?? ""),
      ),
      name: formationName(template.label, t),
      apply: async () => {
        // 当てる前にそのシーンを開く。どこが変わったのか見えないと確かめられない
        if (target.id !== selectedSceneId) selectScene(target.id);
        await applyTemplate(template, DEFAULT_TRANSFORM);
      },
    };
  };

  return { sceneFor, actionFor, formationFor };
}
