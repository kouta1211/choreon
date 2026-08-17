"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { ReviewFindingCard } from "@/components/molecules/ReviewFindingCard";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useExtendMoveTime } from "@/features/canvas/hooks/useExtendMoveTime";
import { useClearBlindSpot } from "@/features/canvas/hooks/useClearBlindSpot";
import { findExcessiveMoves } from "@/features/canvas/lib/physicalLimits";
import { buildFormationSummary } from "@/features/review/lib/formationSummary";
import type {
  ReviewFinding,
  ReviewResult,
} from "@/features/review/lib/reviewFindings";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

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
 *
 * ■ 指摘ごとに「当てる／当てない」を決める
 * 指摘が1件ずつ分かれて返ってくるので、当てられるものにはボタンを付ける。
 * **押すまで何も起きない**。当てたあとも元に戻す1回で消える。
 * どこへ動かすか・何秒に延ばすかは**アプリが計算する**
 * (useClearBlindSpot / useExtendMoveTime)。AI が言うのは「誰の、どの事実に
 * ついてか」までで、座標や秒数は言わせていない。
 */
export function ReviewSheet({ project, isOpen, onClose }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);

  const [review, setReview] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  /** 当てた指摘。何件目か（同じ文が2つ返ることは無いが、番号の方が安い） */
  const [appliedIndexes, setAppliedIndexes] = useState<number[]>([]);

  const { suggestFor, extendTo } = useExtendMoveTime();
  const { suggestXFor, moveOut } = useClearBlindSpot();

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;
  const nextScene = scenes[index + 1] ?? null;
  const positions = scene ? (positionsBySceneId[scene.id] ?? {}) : {};
  const nextPositions = nextScene
    ? (positionsBySceneId[nextScene.id] ?? {})
    : {};
  /** 次のシーンまでの秒数。速すぎる移動は「いま → 次」の話なので、無ければ0 */
  const segmentSeconds =
    scene && nextScene ? nextScene.timeSeconds - scene.timeSeconds : 0;

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
   * 直しのボタンを1件ぶん作る。作らない（null）こともある。
   *
   * ここが**いまの隊形**を見ている点が要点。返事を待っている間に user が
   * 自分で直していれば、速すぎる移動も顔被りも消えているので、
   * ボタンは出ない。返ってきた時点の状態でボタンを出すと、
   * 押しても何も起きない／別の場所が動く、になる。
   */
  const actionFor = (finding: ReviewFinding) => {
    if (!finding.fix) return undefined;
    const dancerId = idForName(finding.fix.dancerName);
    if (!dancerId) return undefined;

    if (finding.fix.kind === "clearBlindSpot") {
      if (suggestXFor(dancerId) === null) return undefined;
      return {
        label: t.dancer.badges.blindSpot.moveOut,
        run: () => moveOut(dancerId),
      };
    }

    // retime: 何秒に延ばすかはアプリが計算する
    if (segmentSeconds <= 0) return undefined;
    const strain = findExcessiveMoves(
      positions,
      nextPositions,
      segmentSeconds,
    ).get(dancerId);
    if (!strain) return undefined;
    const seconds = suggestFor(strain);
    if (seconds === null) return undefined;
    return {
      label: t.dancer.badges.excessiveMove.extend(seconds),
      run: () => extendTo(seconds),
    };
  };

  const run = async () => {
    if (!scene) return;
    setIsRunning(true);
    setError(null);
    setReview(null);
    setAppliedIndexes([]);

    try {
      const summary = buildFormationSummary({
        scene,
        previousScene: scenes[index - 1] ?? null,
        nextScene,
        dancers,
        positions,
        nextPositions,
        stageWidth: project.stageWidth,
        stageHeight: project.stageHeight,
      });

      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const data = (await response.json()) as {
        review?: ReviewResult;
        text?: string;
        error?: string;
      };

      if (!response.ok || !(data.review ?? data.text)) {
        setError(data.error ?? t.review.failed);
        return;
      }
      // review が無い版の返事でも読めるようにしておく（畳んだ文章だけ出す）
      setReview(data.review ?? { summary: data.text ?? "", findings: [] });
    } catch {
      setError(t.review.offline);
    } finally {
      setIsRunning(false);
    }
  };

  const hasFix = review?.findings.some((finding) => actionFor(finding));

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t.review.title}
      titleRight={scene?.name}
    >
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <p className="text-label leading-[1.65] text-fg-sub">{t.review.note}</p>

        {review?.summary && (
          <p className="text-label leading-[1.75] font-semibold text-fg-strong">
            {review.summary}
          </p>
        )}

        {review?.findings.map((finding, position) => {
          const action = actionFor(finding);
          return (
            <ReviewFindingCard
              key={position}
              tone={finding.tone}
              toneLabel={finding.tone === "good" ? t.review.good : t.review.watch}
              text={finding.text}
              appliedLabel={t.review.applied}
              isApplied={appliedIndexes.includes(position)}
              action={
                action && {
                  label: action.label,
                  onAction: () => {
                    setAppliedIndexes((current) => [...current, position]);
                    void action.run();
                  },
                }
              }
            />
          );
        })}

        {/* 直しのボタンが1つも無いときに出しても、意味が分からない */}
        {hasFix && (
          <p className="text-caption leading-[1.65] text-fg-muted">
            {t.review.decide}
          </p>
        )}

        {error && (
          <p className="rounded-[calc(var(--radius)*0.8)] bg-fg/5 p-3 text-label text-fg-sub">
            {error}
          </p>
        )}

        <PressableButton
          kind="primary"
          onClick={() => void run()}
          disabled={isRunning || !scene}
          className="flex h-11 items-center justify-center gap-1.5 rounded-[calc(var(--radius)*0.9)] bg-accent text-label font-semibold text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.22)] disabled:opacity-50"
        >
          <Sparkles size={15} />
          {isRunning ? t.review.running : review ? t.review.again : t.review.run}
        </PressableButton>
      </div>
    </BottomSheet>
  );
}
