"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { ReviewFindingCard } from "@/components/molecules/ReviewFindingCard";
import { FormationPreview } from "@/components/molecules/FormationPreview";
import { useReviewActions } from "@/features/review/hooks/useReviewActions";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { buildFormationSummary } from "@/features/review/lib/formationSummary";
import { buildPieceSummary } from "@/features/review/lib/pieceSummary";
import type { ReviewResult } from "@/features/review/lib/reviewFindings";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

/** 1シーンだけか、作品ぜんぶか */
type Scope = "scene" | "piece";

/**
 * 隊形を、AIに一度だけ見てもらう。
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
 * ■ 範囲が2つある
 * **このシーン**は「この配置はどう見えるか」。**作品ぜんぶ**は
 * 「並びと流れ」— 同じ形が続いていないか、移動時間の配り方はどうか。
 * 作品ぜんぶでは**立ち位置そのものを送らない**（散り具合・重心・警告だけ）。
 * 30シーン分の座標を送ると、返事の質より先に上限に当たる。
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
  const selectScene = useUIStore((state) => state.selectScene);

  const [scope, setScope] = useState<Scope>("scene");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  /** 当てた指摘。何件目か（同じ文が2つ返ることは無いが、番号の方が安い） */
  const [appliedIndexes, setAppliedIndexes] = useState<number[]>([]);

  /* 指摘1件に対して**いま何ができるか**の判断は、まとめて外に出してある
     （useReviewActions）。約束が集まっている場所なので、画面を描かずに
     試せるようにした */
  const { sceneFor, actionFor, formationFor } = useReviewActions(project);

  const index = scenes.findIndex((item) => item.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;

  /** 送るもの。どちらの範囲でも**座標は最小限**にしてある */
  const buildBody = (current: Scene) =>
    scope === "piece"
      ? {
          piece: buildPieceSummary({
            scenes,
            dancers,
            positionsBySceneId,
            stageWidth: project.stageWidth,
            stageHeight: project.stageHeight,
          }),
        }
      : {
          summary: buildFormationSummary({
            scene: current,
            previousScene: scenes[index - 1] ?? null,
            nextScene: scenes[index + 1] ?? null,
            dancers,
            positions: positionsBySceneId[current.id] ?? {},
            nextPositions: scenes[index + 1]
              ? (positionsBySceneId[scenes[index + 1].id] ?? {})
              : {},
            stageWidth: project.stageWidth,
            stageHeight: project.stageHeight,
          }),
        };

  const run = async () => {
    // 作品ぜんぶでもシーンは要る（1シーンぶんの組み立てに使う）
    if (!scene) return;
    setIsRunning(true);
    setError(null);
    setReview(null);
    setAppliedIndexes([]);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody(scene)),
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
      titleRight={scope === "piece" ? t.review.wholePiece : scene?.name}
    >
      <div className="flex flex-col gap-3 px-[18px] py-4">
        {/* シーンが2つ以上ないと「流れ」の話にならない */}
        {scenes.length > 1 && (
          <SegmentedControl
            label={t.review.scope}
            value={scope}
            onChange={(next) => {
              setScope(next);
              // 範囲を変えたら前の返事は別の話になる。残すと、どちらの
              // 話なのか読めない板が出たままになる
              setReview(null);
              setError(null);
              setAppliedIndexes([]);
            }}
            options={[
              { value: "scene", label: t.review.scopeScene },
              { value: "piece", label: t.review.scopePiece },
            ]}
          />
        )}

        <p className="text-label leading-[1.65] text-fg-sub">
          {scope === "piece" ? t.review.scopePieceNote : t.review.note}
        </p>

        {review?.summary && (
          <p className="text-label leading-[1.75] font-semibold text-fg-strong">
            {review.summary}
          </p>
        )}

        {review?.findings.map((finding, position) => {
          const action = actionFor(finding);
          const target = finding.sceneNumber ? sceneFor(finding) : null;
          const example = formationFor(finding);
          return (
            <ReviewFindingCard
              key={position}
              tone={finding.tone}
              toneLabel={
                finding.tone === "good" ? t.review.good : t.review.watch
              }
              text={finding.text}
              appliedLabel={t.review.applied}
              isApplied={appliedIndexes.includes(position)}
              scene={
                target && finding.sceneNumber
                  ? {
                      label: t.review.inScene(
                        finding.sceneNumber,
                        target.name,
                      ),
                      // 開いているシーンなら、押しても何も起きない
                      onOpen:
                        target.id === selectedSceneId
                          ? undefined
                          : () => selectScene(target.id),
                    }
                  : undefined
              }
              action={
                action && {
                  label: action.label,
                  onAction: () => {
                    setAppliedIndexes((current) => [...current, position]);
                    void action.run();
                  },
                }
              }
              formation={
                example && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <p className="flex flex-wrap items-baseline gap-x-1 text-caption text-fg-muted">
                      <span>{t.review.formationExample}</span>
                      <span className="font-semibold text-fg-sub">
                        {example.name}
                      </span>
                    </p>
                    {/* 幅を抑える。ステージの縦横比のまま横幅いっぱいにすると
                        シートの半分以上を図が占めて、指摘が読めなくなる
                        （テンプレートの一覧では小さな枠の中なので起きない） */}
                    <FormationPreview
                      formation={example.template}
                      dancerCount={example.dancerCount}
                      stageWidth={project.stageWidth}
                      stageHeight={project.stageHeight}
                      dancerColors={example.dancerColors}
                      audienceLabel={t.review.audienceSide}
                      className="max-w-[240px]"
                    />
                    {/* 図を見て決められるようにする。押すまで何も起きない */}
                    {!appliedIndexes.includes(position) && (
                      <>
                        <PressableButton
                          kind="primary"
                          onClick={() => {
                            setAppliedIndexes((current) => [
                              ...current,
                              position,
                            ]);
                            void example.apply();
                          }}
                          className="flex h-8 w-full items-center justify-center rounded-[calc(var(--radius)*0.6)] border border-accent bg-accent/12 text-label font-semibold text-accent-soft"
                        >
                          {t.review.formationApply}
                        </PressableButton>
                        <p className="text-caption text-fg-muted">
                          {t.review.formationNote}
                        </p>
                      </>
                    )}
                  </div>
                )
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
