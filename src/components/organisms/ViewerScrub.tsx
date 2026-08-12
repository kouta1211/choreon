"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { capturePointer, releasePointer } from "@/lib/pointerCapture";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";
import { formatClock } from "@/components/molecules/PlayheadClock";
import { axisX } from "@/features/music/lib/timelineScale";

/** エディタの帯(80px)より低い。コマを小さくできるぶん */
const BAND_HEIGHT = 56;
const RULER_HEIGHT = 14;
const CARD_WIDTH = 28;
const SELECTED_CARD_WIDTH = 34;
/** 再生ヘッドは常に中央。エディタは43%だが、こちらは止めて見る道具 */
const PLAYHEAD_RATIO = 0.5;
/** 見るだけなので、エディタより引き気味の縮尺で十分 */
const PX_PER_SECOND = 24;

/**
 * ビューアのスクラブ帯。この画面の主操作。
 *
 * ■ 再生ボタンより大きい
 * 稽古場で知りたいのは特定の瞬間の立ち位置で、それは指で止められる
 * 操作の方が速い。エディタとは階層が逆で、帯が画面幅いっぱい、
 * 再生は36pxの枠線ボタンに格下げしてある。
 *
 * ■ 再生ヘッドは中央に固定
 * エディタは次に来る隊形を見る時間が要るので43%だが、こちらは
 * 「止めて見る」道具なので中央でよい。
 *
 * ■ 自分のコマにさしかかると触覚
 * 目を上げずに「自分の出番が来た」が分かる。ただし iOS では鳴らないので、
 * 触覚だけが伝える情報にはしていない。
 */
export function ViewerScrub() {
  const project = useViewerStore((state) => state.project);
  const scenes = useViewerStore((state) => state.scenes);
  const dancers = useViewerStore((state) => state.dancers);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);

  const bandRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(0);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{
    x: number;
    seconds: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewport(entry.contentRect.width),
    );
    observer.observe(band);
    setViewport(band.clientWidth);
    return () => observer.disconnect();
  }, []);

  // 自分の出るシーンにさしかかったら、一度だけ触覚を返す。
  // 目を上げずに「自分の出番が来た」が分かる
  const currentSceneId = scenes.findLast
    ? (scenes.findLast((scene) => scene.timeSeconds <= currentSeconds)?.id ??
      null)
    : null;
  const lastHapticRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentSceneId || lastHapticRef.current === currentSceneId) return;
    lastHapticRef.current = currentSceneId;
    if (focusedDancerId && positionsBySceneId[currentSceneId]?.[focusedDancerId]) {
      vibrate(TAP_PATTERN);
    }
  }, [currentSceneId, focusedDancerId, positionsBySceneId]);

  if (!project) return null;

  const focusColor = focusedDancerId
    ? themedDancerColor(
        dancers.find((dancer) => dancer.id === focusedDancerId)?.color ??
          "#888",
      )
    : null;

  // 再生ヘッドが中央に来るように軸を流す
  const scrollX = axisX(currentSeconds, PX_PER_SECOND) - viewport * PLAYHEAD_RATIO;

  /**
   * 指の【動いた量】で時刻を動かす。
   *
   * 押した場所の絶対位置から出すと、時刻が変われば軸も流れるので、
   * 次のフレームでまた別の時刻が出る(自分の尻尾を追いかける)。
   * 掴んだ瞬間の時刻を覚えておいて、そこからの差だけを足す。
   */
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragStartRef.current = {
      x: event.clientX,
      seconds: currentSeconds,
      moved: false,
    };
    capturePointer(event.currentTarget, event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!draggingRef.current || !start) return;

    const delta = event.clientX - start.x;
    if (!start.moved && Math.abs(delta) < 3) return;
    start.moved = true;
    // 指を右へ払うと軸が右へ流れる = 時刻は戻る
    setCurrentSeconds(Math.max(0, start.seconds - delta / PX_PER_SECOND));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    draggingRef.current = false;
    dragStartRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);

    // 動かさずに離したら、押した場所へ飛ぶ
    if (start && !start.moved) {
      const rect = bandRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centre = rect.left + rect.width * PLAYHEAD_RATIO;
      setCurrentSeconds(
        Math.max(0, start.seconds + (event.clientX - centre) / PX_PER_SECOND),
      );
    }
  };

  return (
    <div className="flex flex-col">
      <div
        ref={bandRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ height: BAND_HEIGHT }}
        className="relative touch-none overflow-hidden rounded-lg bg-surface-sunken"
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{ transform: `translateX(${-scrollX}px)` }}
        >
          {scenes.map((scene, index) => {
            const isCurrent =
              currentSeconds >= scene.timeSeconds &&
              (scenes[index + 1]?.timeSeconds ?? Infinity) > currentSeconds;
            const width = isCurrent ? SELECTED_CARD_WIDTH : CARD_WIDTH;
            const positions = positionsBySceneId[scene.id] ?? {};

            return (
              <span
                key={scene.id}
                aria-hidden
                style={{
                  left: axisX(scene.timeSeconds, PX_PER_SECOND),
                  marginLeft: -width / 2,
                  width,
                  height: Math.round(
                    (width * project.stageHeight) / project.stageWidth,
                  ),
                }}
                className={`absolute top-1/2 block -translate-y-1/2 overflow-hidden rounded-[4px] bg-stage ${
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
                        top: `${(position.yCoordinate / project.stageHeight) * 100}%`,
                        width: isOwn ? 4 : 3,
                        height: isOwn ? 4 : 3,
                        background:
                          isOwn && dancer
                            ? themedDancerColor(dancer.color)
                            : "color-mix(in oklab, var(--fg) 25%, transparent)",
                      }}
                      className="absolute block -translate-x-1/2 -translate-y-1/2 rounded-full"
                    />
                  );
                })}
              </span>
            );
          })}
        </div>

        <span
          aria-hidden
          style={{
            left: `${PLAYHEAD_RATIO * 100}%`,
            background: focusColor ?? "var(--fg-strong)",
          }}
          className="pointer-events-none absolute inset-y-0 block w-0.5"
        />
      </div>

      {/* 目盛り。いま何分何秒を見ているか */}
      <div
        style={{ height: RULER_HEIGHT }}
        className="flex items-center justify-center"
      >
        <span className="font-mono text-[10.5px] tabular-nums text-fg-muted">
          {formatClock(currentSeconds)}
        </span>
      </div>
    </div>
  );
}
