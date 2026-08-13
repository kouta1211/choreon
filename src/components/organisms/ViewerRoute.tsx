"use client";

import { useMemo, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { formatClock, formatMinutes } from "@/components/molecules/PlayheadClock";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { describeMove } from "@/features/viewer/lib/describeMove";
import { sceneSpanAt } from "@/features/viewer/lib/interpolate";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";

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
  const dancers = useViewerStore((state) => state.dancers);
  const scenes = useViewerStore((state) => state.scenes);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);
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
        ...move,
      });
    }
    return result;
  }, [focusedDancerId, scenes, positionsBySceneId]);

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
            <span className="text-fg-muted">ここが最後の隊形です</span>
          )}
        </p>
        <PressableButton
          onClick={() => setSheetOpen(true)}
          className="flex h-8 shrink-0 items-center rounded-lg bg-surface-raised px-3 text-label text-fg-sub"
        >
          ぜんぶ
        </PressableButton>
      </div>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`${dancer?.name ?? "自分"} の道順`}
        titleRight={`${scenes.length} シーン · 通し ${formatMinutes(totalSeconds)}`}
        isTall
      >
        {/* 注記は1度だけ。行ごとに書くと、肝心の道順が埋もれる */}
        <p className="border-b border-line px-[18px] py-3 text-[11.5px] leading-[1.6] text-fg-muted">
          歩数は 1歩 60cm・1マス 90cm で計算した目安です。
          <span className="font-semibold text-fg-sub">
            上手／下手は客席から見た向きです。
          </span>
        </p>

        <ul className="px-[18px] py-2">
          {steps.map((step) => {
            const isHere = current?.sceneId === step.sceneId;
            return (
              <li key={step.sceneId}>
                <PressableButton
                  onClick={() => {
                    setCurrentSeconds(step.timeSeconds);
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
                    isHere
                      ? "bg-accent/12"
                      : "border-transparent"
                  }`}
                >
                  <span className="w-[26px] shrink-0 pt-0.5 text-right font-mono text-[11px] text-fg-muted">
                    {step.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-snug text-fg">
                      {step.text}
                      {step.turn && (
                        <span className="text-fg-sub"> {step.turn}</span>
                      )}
                      {step.isFast && (
                        <span className="text-fg-sub"> — 速め</span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-fg-muted">
                      {formatClock(step.timeSeconds)} ·{" "}
                      {step.seconds.toFixed(1)}秒かけて
                      {isHere && " · いまここ"}
                    </span>
                  </span>
                  {/* 速い移動の印。色ではなく形で示す
                      — 赤いダンサーが普通に存在するため */}
                  {step.isFast && (
                    <TriangleAlert
                      size={20}
                      className="mt-0.5 shrink-0 text-fg-sub"
                      aria-label="歩いて間に合わない速さです"
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
