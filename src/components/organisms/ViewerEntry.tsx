"use client";

import { useState } from "react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";
import { DancerMarker } from "@/components/molecules/DancerIcon";
import { formatMinutes } from "@/features/scene/lib/clock";
import { useViewerOrderOnly } from "@/features/viewer/hooks/useViewerOrderOnly";
import { useT } from "@/features/i18n/LocaleProvider";
import { Phrase } from "@/components/atoms/Phrase";

/** ここでは押す的なので、エディタの26pxより大きい */
const MARKER_SIZE = 40;

/**
 * 開いた最初に「あなたはどれですか」を訊く画面。
 *
 * ■ なぜ最初に訊くのか
 * 選ぶまでこの画面の意味は半分しかない。「サビで自分はどこ」を
 * 見に来た人にとって、自分が誰か決まっていない隊形図は、
 * 貼り出された全体図と変わらない。あとから探させない。
 *
 * ■ 1シーン目の立ち位置を絵で出す
 * 名前を覚えていなくても、立ち位置なら分かることが多い。
 * 丸と名前チップの【どちらからでも】選べるようにしてある。
 */
export function ViewerEntry() {
  const t = useT();
  const project = useViewerStore((state) => state.project);
  const dancers = useViewerStore((state) => state.dancers);
  const scenes = useViewerStore((state) => state.scenes);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const focusDancer = useViewerStore((state) => state.focusDancer);
  const isOrderOnly = useViewerOrderOnly();

  /* **選ぶのと、決めるのを分ける**(2026-08-18、実機の報告 02-1)。
     以前は丸や名前を押した時点で focusDancer を呼んでいたので、
     **押した瞬間に道順の画面へ進んでしまい、間違えても選び直せなかった**。
     下の「「〜」で見る」ボタンは押されることが無く、死んだ飾りになっていた。
     ここでは端末に覚えている分を初期値にして、決めるまでは手元で持つ */
  const [pendingId, setPendingId] = useState<string | null>(focusedDancerId);

  if (!project) return null;

  const firstScene = scenes[0];
  const positions = firstScene ? (positionsBySceneId[firstScene.id] ?? {}) : {};
  const totalSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;
  const selected = dancers.find((dancer) => dancer.id === pendingId);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col gap-gutter overflow-y-auto px-gutter pt-gutter-lg pb-[max(var(--spacing-gutter-lg),env(safe-area-inset-bottom))]">
      <div>
        {/* サービス名の表記は Choreon で統一する。「見るだけ」は外した
            — 見る人にとっては、それが唯一の画面なので断る必要が無い
            （実機の報告 2026-08-19） */}
        <p className="font-mono text-caption tracking-wide text-fg-muted">
          Choreon
        </p>
        <h1 className="mt-base text-title leading-tight font-semibold text-fg-strong">
          {project.title}
        </h1>
        <p className="mt-base font-mono text-caption text-fg-muted">
          {isOrderOnly
            ? t.viewer.entry.countsNoTime(scenes.length, dancers.length)
            : t.viewer.entry.counts(
                scenes.length,
                dancers.length,
                formatMinutes(totalSeconds),
              )}
        </p>
      </div>

      <div>
        <h2 className="text-body font-semibold text-fg-strong">
          {t.viewer.entry.question}
        </h2>
        <p className="mt-base text-label leading-relaxed text-fg-sub">
          <Phrase>{t.viewer.entry.note}</Phrase>
        </p>
      </div>

      {/* 1シーン目の立ち位置。丸をそのまま押して選べる */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-line-strong bg-stage"
        style={{
          aspectRatio: `${project.stageWidth} / ${project.stageHeight}`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
          style={{
            backgroundSize: `${100 / project.stageWidth}% ${100 / project.stageHeight}%`,
          }}
        />
        {dancers.map((dancer) => {
          const position = positions[dancer.id];
          if (!position) return null;
          const isSelected = dancer.id === pendingId;

          return (
            <PressableButton
              key={dancer.id}
              // 掴んで動かすものではないが、ステージの上のマーカーなので
              // 沈めずに持ち上げる(ダンサーのマーカーと同じ扱い)
              kind="lift"
              haptic
              // 名前チップと同じ読み上げにすると、2つ同じものが並ぶ。
              // どちらから選んでもよいが、何を押しているかは違う
              aria-label={t.viewer.entry.position(dancer.name)}
              aria-pressed={isSelected}
              onClick={() => setPendingId(dancer.id)}
              style={{
                left: `${(position.xCoordinate / project.stageWidth) * 100}%`,
                top: `${(position.yCoordinate / project.stageHeight) * 100}%`,
                width: MARKER_SIZE,
                height: MARKER_SIZE,
                transform: "translate(-50%, -50%)",
                /* 選んだ人以外を薄くする。輪で囲むより周りが見える
                   （実機の報告 2026-08-19）。大きさの強調は
                   DancerMarker が isFocused で行う */
                opacity: !pendingId || isSelected ? 1 : 0.45,
              }}
              className="absolute transition-opacity duration-200 motion-reduce:transition-none"
            >
              {/* 実物のマーカー(頭＋鼻先)。ここで見る丸と、次の画面の丸が
                  別物だと「自分はどれか」を探し直すことになる
                  (実機の報告 2026-08-19)。押す的は MARKER_SIZE のまま */}
              <span className="absolute top-1/2 left-1/2">
                <DancerMarker
                  dancer={dancer}
                  rotationAngle={position.rotationAngle}
                  isFocused={isSelected}
                />
              </span>
            </PressableButton>
          );
        })}
      </div>

      {/* 名前からも選べる。立ち位置で分からない人のため */}
      <div className="flex flex-wrap gap-unit">
        {dancers.map((dancer) => {
          const color = themedDancerColor(dancer.color);
          const isSelected = dancer.id === pendingId;
          return (
            <PressableButton
              key={dancer.id}
              haptic
              onClick={() => setPendingId(dancer.id)}
              aria-pressed={isSelected}
              style={
                isSelected
                  ? {
                      borderColor: color,
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                    }
                  : undefined
              }
              className={`flex h-target items-center gap-unit rounded-xl border px-3 text-label ${
                isSelected
                  ? "font-semibold text-fg-strong"
                  : "border-line-strong text-fg-sub"
              }`}
            >
              <span
                aria-hidden
                style={{ background: color }}
                className="block h-3 w-3 shrink-0 rounded-full"
              />
              {dancer.name}
            </PressableButton>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-unit pt-gutter">
        <PressableButton
          kind="primary"
          disabled={!selected}
          onClick={() => selected && focusDancer(selected.id)}
          className="flex h-target-lg items-center justify-center rounded-xl bg-accent text-body font-semibold text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.22)] disabled:opacity-40"
        >
          {selected
            ? t.viewer.entry.pickNamed(selected.name)
            : t.viewer.entry.pick}
        </PressableButton>
        <PressableButton
          onClick={() => focusDancer(null)}
          className="flex h-target items-center justify-center rounded-xl border border-line-strong text-label text-fg-sub"
        >
          {t.viewer.entry.skip}
        </PressableButton>
      </div>
    </div>
  );
}
