"use client";

import { useMemo, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  formatClock,
  formatMinutes,
} from "@/components/molecules/PlayheadClock";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { describeMove } from "@/features/viewer/lib/describeMove";
import { sceneSpanAt } from "@/features/viewer/lib/interpolate";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { useT } from "@/features/i18n/LocaleProvider";
import { moveText } from "@/features/i18n/lib/moveText";

type Step = {
  sceneId: string;
  number: number;
  name: string;
  timeSeconds: number;
  text: string;
  turn: string | null;
  isFast: boolean;
  seconds: number;
};

/**
 * 自分の道順。ステージの直下に1行、「ぜんぶ」で全部。
 *
 * ■ 文だけを出して、座標を出さない
 * 稽古場で読むのは「(3.0, 6.0) から (7.0, 2.0)」ではなく
 * 「下手前へ 約6歩」。差分から言葉を作るのは describeMove の仕事で、
 * ここは並べるだけ。
 */
export function ViewerRoute() {
  const t = useT();
  const dancers = useViewerStore((state) => state.dancers);
  const scenes = useViewerStore((state) => state.scenes);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  /* 一覧から飛ぶときも再生を止める。帯・シーン一覧と同じ作法にする
     — 3つのうち1つだけ止まらないと、止まらない方を不具合と読む */
  const jumpToSeconds = useViewerStore((state) => state.jumpToSeconds);
  const [isSheetOpen, setSheetOpen] = useState(false);

  const steps = useMemo<Step[]>(() => {
    if (!focusedDancerId) return [];

    const result: Step[] = [];
    for (let index = 1; index < scenes.length; index += 1) {
      const previous = scenes[index - 1];
      const scene = scenes[index];
      const from = positionsBySceneId[previous.id]?.[focusedDancerId];
      const to = positionsBySceneId[scene.id]?.[focusedDancerId];
      if (!from || !to) continue;

      const seconds = scene.timeSeconds - previous.timeSeconds;
      const move = describeMove(from, to, seconds);
      result.push({
        sceneId: scene.id,
        number: index + 1,
        name: scene.name,
        timeSeconds: scene.timeSeconds,
        isFast: move.isFast,
        seconds: move.seconds,
        // 差分の読み取りと文の組み立ては別。語順は言語で変わる
        ...moveText(move, t),
      });
    }
    return result;
  }, [focusedDancerId, scenes, positionsBySceneId, t]);

  if (!focusedDancerId) return null;

  const dancer = dancers.find((item) => item.id === focusedDancerId);
  const span = sceneSpanAt(scenes, currentSeconds);
  // いま向かっている先の1行。区間の終わり側のシーンを指す
  const current = span?.to
    ? steps.find((step) => step.sceneId === span.to?.id)
    : steps[steps.length - 1];

  const totalSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;

  return (
    <>
      {/* この1行がこの画面の主役。稽古場で見るのは「次にどこへ何歩か」で、
          それを座標ではなく言葉で置く */}
      <div className="overlay-panel flex h-target-lg items-center gap-unit rounded-2xl px-gutter">
        <ArrowRight size={22} className="shrink-0 text-fg-sub" />
        <p className="min-w-0 flex-1 text-label text-fg">
          {current ? (
            <>
              <span className="text-body font-semibold text-fg-strong">
                {current.text}
              </span>
              {current.turn && (
                <span className="text-fg-sub"> {current.turn}</span>
              )}
              <span className="text-fg-muted">
                （{current.seconds.toFixed(1)}秒かけて）
              </span>
            </>
          ) : (
            <span className="text-fg-muted">
              {t.viewer.route.lastFormation}
            </span>
          )}
        </p>
        <PressableButton
          onClick={() => setSheetOpen(true)}
          className="flex h-8 shrink-0 items-center rounded-lg bg-surface-raised px-3 text-label text-fg-sub"
        >
          {t.viewer.route.all}
        </PressableButton>
      </div>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t.viewer.route.title(dancer?.name ?? t.viewer.route.me)}
        titleRight={t.viewer.route.summary(
          scenes.length,
          formatMinutes(totalSeconds),
        )}
        isTall
      >
        {/* 注記は1度だけ。行ごとに書くと、肝心の道順が埋もれる */}
        <p className="border-b border-line px-[18px] py-3 text-caption leading-[1.6] text-fg-muted">
          {t.viewer.route.stepsNote}
          <span className="font-semibold text-fg-sub">
            {t.viewer.route.sidesNote}
          </span>
        </p>

        <ul className="px-[18px] py-2">
          {steps.map((step) => {
            const isHere = current?.sceneId === step.sceneId;
            return (
              <li key={step.sceneId}>
                <PressableButton
                  onClick={() => {
                    jumpToSeconds(step.timeSeconds);
                    setSheetOpen(false);
                  }}
                  style={
                    isHere && dancer
                      ? {
                          borderColor: themedDancerColor(dancer.color),
                        }
                      : undefined
                  }
                  className={`flex w-full items-start gap-2.5 rounded-[calc(var(--radius)*0.7)] border-l-2 py-2.5 pr-2 pl-2.5 text-left ${
                    isHere ? "bg-accent/12" : "border-transparent"
                  }`}
                >
                  <span className="w-[26px] shrink-0 pt-0.5 text-right font-mono text-caption text-fg-muted">
                    {step.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-label leading-snug text-fg">
                      {step.text}
                      {step.turn && (
                        <span className="text-fg-sub"> {step.turn}</span>
                      )}
                      {step.isFast && (
                        <span className="text-fg-sub">
                          {t.viewer.route.fast}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-mono text-caption text-fg-muted">
                      {formatClock(step.timeSeconds)} ·{" "}
                      {step.seconds.toFixed(1)}秒かけて
                      {isHere && t.viewer.route.hereNow}
                    </span>
                  </span>
                  {/* 速い移動の印。色ではなく形で示す
                      — 赤いダンサーが普通に存在するため */}
                  {step.isFast && (
                    <TriangleAlert
                      size={20}
                      className="mt-0.5 shrink-0 text-fg-sub"
                      aria-label={t.viewer.route.tooFast}
                    />
                  )}
                </PressableButton>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
