"use client";

import { useEffect, useRef } from "react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useViewerCountLabel } from "@/features/viewer/hooks/useViewerCountLabel";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { toScreenY } from "@/features/canvas/lib/stageFlip";

/** コマの幅(px)。指で押し分けられて、隊形の形が読める大きさ */
const CARD_WIDTH = 56;

/**
 * 見る画面のいちばん下の帯。**シーンを順に、等間隔で並べる**。
 *
 * ■ なぜ時刻の場所に置くのをやめたのか（実機の報告 2026-08-19）
 * 前は時刻に比例した位置へ置いていたので、シーンの時刻が近いと
 * **コマ同士が重なって、下のコマが押せなかった**（当たり判定は前面で決まる）。
 * 目盛りを広げて逃げたが、極端に詰まった作品では追いつかない。
 *
 * 見る人が選ぶのは「何番目のシーンか」であって「何秒差か」ではない。
 * 等間隔に並べれば**重なりは原理的に起きず**、どのコマも同じ大きさで押せる。
 * 秒差は各コマに数字で書く（長さで表さない）。
 *
 * ■ 波形と拍の縞は出さない
 * あれは時間に比例して描くものなので、コマだけ等間隔にすると位置が
 * 食い違って嘘になる。等間隔を採るなら、背景は捨てるのが筋。
 *
 * ■ 再生は今までどおり作品の時刻で進む
 * 並べ方を変えただけで、いつ次のシーンへ移るかは `timeSeconds` のまま。
 * 作り手が決めた曲・メトロノームの設定がそのまま効く。
 */
export function ViewerSceneStrip() {
  const project = useViewerStore((state) => state.project);
  const countLabel = useViewerCountLabel();
  const scenes = useViewerStore((state) => state.scenes);
  const dancers = useViewerStore((state) => state.dancers);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  /* 飛ぶときは再生を止める（実機の要望 2026-08-19）。止めないと、
     押した先から再生が続いて、見たかったシーンをすぐ通り過ぎる */
  const jumpToSeconds = useViewerStore((state) => state.jumpToSeconds);
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);

  const currentIndex = scenes.findIndex(
    (scene, index) =>
      currentSeconds >= scene.timeSeconds &&
      (scenes[index + 1]?.timeSeconds ?? Infinity) > currentSeconds,
  );
  const currentRef = useRef<HTMLLIElement>(null);

  /* 再生でシーンが移ったら、そのコマを真ん中へ寄せる。
     押して選んだときも同じ動きになるので、扱いを分けない */
  useEffect(() => {
    currentRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentIndex]);

  if (!project || scenes.length === 0) return null;

  return (
    /* 横に流す。等間隔なので、指で弾けば端まで届く */
    <ul className="flex snap-x gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {scenes.map((scene, index) => {
        const isCurrent = index === currentIndex;
        const positions = positionsBySceneId[scene.id] ?? {};

        return (
          <li
            key={scene.id}
            ref={isCurrent ? currentRef : undefined}
            className="shrink-0 snap-center"
          >
            <PressableButton
              onClick={() => jumpToSeconds(scene.timeSeconds)}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`${index + 1} ${scene.name}`}
              style={{ width: CARD_WIDTH }}
              className="flex flex-col items-center gap-0.5"
            >
              {/* 隊形の形。細かい向きまでは要らないので点で置く */}
              <span
                style={{
                  height: Math.round(
                    (CARD_WIDTH * project.stageHeight) / project.stageWidth,
                  ),
                }}
                className={`relative block w-full overflow-hidden rounded-sm bg-stage ${
                  isCurrent
                    ? "border-2 border-accent"
                    : "border border-line-strong"
                }`}
              >
                {Object.values(positions).map((position) => {
                  const isOwn = position.dancerId === focusedDancerId;
                  const dancer = dancers.find(
                    (item) => item.id === position.dancerId,
                  );
                  return (
                    <span
                      key={position.dancerId}
                      style={{
                        left: `${(position.xCoordinate / project.stageWidth) * 100}%`,
                        top: `${
                          (toScreenY(
                            position.yCoordinate,
                            project.stageHeight,
                            isAudienceOnTop,
                          ) /
                            project.stageHeight) *
                          100
                        }%`,
                        width: isOwn ? 6 : 4,
                        height: isOwn ? 6 : 4,
                        /* ⚠️ **`--fg` というトークンは無い**（2026-09-25 に
                           user の報告「コマが全て真っ暗」で判明）。
                           Tailwind の `text-fg` は `--color-fg` → `--text` と
                           辿るので効くが、**生の `var(--fg)` は空**になる。
                           空を混ぜた `color-mix()` は値として無効なので、
                           background ごと落ちて **rgba(0,0,0,0)** になっていた
                           （＝どの点も描かれない）。
                           「選ばずに全員を見る」だと自分の点も無いので、
                           24コマが全部まっさらな黒板になっていた。

                           濃さは数で決めず、**その用の名前を持つトークン**
                           （`--text-muted` ＝ 読めるが主役ではない）を使う。
                           テーマごとに調整済みの値が入っている */
                        background:
                          isOwn && dancer
                            ? themedDancerColor(dancer.color)
                            : "var(--text-muted)",
                      }}
                      className="absolute block -translate-x-1/2 -translate-y-1/2 rounded-full"
                    />
                  );
                })}
              </span>

              {/* 何番目かと、（曲があれば）何秒か。秒差は長さではなく
                  数字で伝える。順番だけの作品では時刻を出さない */}
              <span
                className={`font-mono text-mono-s ${
                  isCurrent ? "text-fg-strong" : "text-fg-muted"
                }`}
              >
                {index + 1}
              </span>
              <span className="font-mono text-caption text-fg-muted">
                {countLabel(scene.positionBeats)}
              </span>
            </PressableButton>
          </li>
        );
      })}
    </ul>
  );
}
