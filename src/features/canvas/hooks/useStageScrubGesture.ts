"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate } from "motion/react";
import {
  applyRubberBand,
  resolveAxis,
  scrubProgress,
  shouldCommitScrub,
  type ScrubAxis,
} from "@/features/canvas/lib/sceneScrub";
import { resolveTransitionDuration } from "@/features/canvas/constants";
import type { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";

/** 指を離してから隣のシーンに収まるまで(秒)。仕様書の .32s */
const SNAP_SECONDS = 0.32;

/** 仕様書のイージング cubic-bezier(.2,.7,.2,1) */
const SNAP_EASE = [0.2, 0.7, 0.2, 1] as const;

type Params = {
  /** 中央のステージ。1シーンぶんの移動距離(span)をここの実寸から測る */
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** 表示順のシーンID */
  sceneIds: string[];
  selectedSceneId: string | null;
  selectScene: (sceneId: string) => void;
  /** ステージの何も無いところを叩いたときに選択を外すために使う */
  selectDancer: (dancerId: string | null) => void;
  /** 払ってシーンを送る操作を受け付けるか(表示とモードの設定)。
   * オフでも【叩いて選択を外す】方は生かす。あちらは操作の作法であって
   * シーン送りの機能ではない */
  isSwipeEnabled: boolean;
  scrub: ReturnType<typeof useSceneScrub>;
};

/**
 * ステージを横に払って、前後のシーンへ隊形ごと移動するジェスチャ。
 *
 * ステージ自体は動かさない。以前は前後のシーンの板を横にスライドさせて
 * いたが、見ている面が指と一緒に流れると、肝心の隊形が読み取りにくかった。
 * 動くのは【ダンサーだけ】で、板は常に同じ場所に留まる。
 *
 * 進捗をMotionValueで配っているのは、pointermoveのたびにReactを
 * 描き直させないため(useSceneScrub参照)。
 */
export function useStageScrubGesture({
  stageRef,
  sceneIds,
  selectedSceneId,
  selectScene,
  selectDancer,
  isSwipeEnabled,
  scrub,
}: Params) {
  // ジェスチャ1回ぶんの走り書き。stateに置くと毎pointermoveで再レンダーになる
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    axis: ScrubAxis | null;
    /** 直近に書き込んだ移動量(px)。指を離した時の判定に使う */
    delta: number;
    targetSceneId: string | null;
  } | null>(null);

  /** 「1シーンぶん」とみなす指の移動距離。ステージの横幅そのもの。
   * ステージは動かさないので、これは見た目の距離ではなく
   * 「どれだけ引けば隣まで行くか」の目盛りとして使う */
  const span = useCallback(
    () => stageRef.current?.offsetWidth ?? 0,
    [stageRef],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrub || !selectedSceneId) return;
      // ダンサー本体とボタンの上から始まった指は、それぞれの持ち主に譲る。
      // ダンサーはdnd-kitがドラッグとして受け取り、ボタンは押下として働く
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, [data-testid='dancer-icon']")) {
        return;
      }

      // 捕捉は「指がステージの外へ出ても追い続ける」ための上乗せで、
      // 失敗してもジェスチャ自体は成立する。ブラウザによっては
      // 既に離されたポインタを捕まえようとして例外を投げるため、
      // ここで止めずに続ける
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 捕捉できなくてもよい
      }
      scrub.progress.set(0);
      gesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startedAt: event.timeStamp,
        axis: null,
        delta: 0,
        targetSceneId: null,
      };
    },
    [scrub, selectedSceneId],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = gesture.current;
      if (!current || !scrub || current.pointerId !== event.pointerId) return;

      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;

      if (current.axis === null) {
        const axis = resolveAxis(dx, dy);
        if (axis === null) return;
        if (axis === "y") {
          // 縦に払われた。ページのスクロールや、下のシート操作を邪魔しない
          gesture.current = null;
          return;
        }
        current.axis = axis;
      }

      // 払っての送りが切られている間は、軸だけ決めて何も動かさない
      // (指を離したときに「叩いた」と誤判定されないようにするため)
      if (!isSwipeEnabled) return;

      const index = sceneIds.indexOf(selectedSceneId ?? "");
      // 左へ払う(dx<0) = 次のシーンを引き寄せる
      const targetSceneId =
        (dx < 0 ? sceneIds[index + 1] : sceneIds[index - 1]) ?? null;
      if (targetSceneId !== current.targetSceneId) {
        current.targetSceneId = targetSceneId;
        scrub.setTargetSceneId(targetSceneId);
      }

      const delta = applyRubberBand(dx, targetSceneId !== null);
      current.delta = delta;
      scrub.progress.set(scrubProgress(delta, span()));
    },
    [scrub, sceneIds, selectedSceneId, span, isSwipeEnabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = gesture.current;
      if (!current || !scrub || current.pointerId !== event.pointerId) return;
      gesture.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      // 6pxのしきい値を一度も越えていない = 払ったのではなく叩いた。
      // ステージの何も無いところを叩いたときは選択を外す。ダンサーとボタンの
      // 上から始まった指は onPointerDown で弾いてあるので、ここへは来ない
      if (current.axis === null) {
        selectDancer(null);
        scrub.setTargetSceneId(null);
        return;
      }

      const spanPx = span();
      const duration = resolveTransitionDuration(SNAP_SECONDS);
      const committed = shouldCommitScrub({
        deltaPx: current.delta,
        spanPx,
        elapsedMs: event.timeStamp - current.startedAt,
        hasTarget: current.targetSceneId !== null,
      });

      if (committed && current.targetSceneId) {
        const targetSceneId = current.targetSceneId;
        // 隊形の方も最後まで送り届ける。ここで進捗を0へ戻さないのが要点:
        // 戻すと、シーンの差し替えが画面に出るまでの1フレームだけ
        // ダンサーが元の隊形へ跳ね返って見える。1のまま放っておけば
        // 「進捗1の位置」と「新しいシーンの位置」が一致しているので継ぎ目が出ない
        animate(scrub.progress, 1, { duration, ease: [...SNAP_EASE] }).then(
          () => {
            selectScene(targetSceneId);
            scrub.setTargetSceneId(null);
          },
        );
        return;
      }

      // 届かなかった。元の位置へ戻す
      animate(scrub.progress, 0, { duration, ease: [...SNAP_EASE] }).then(
        () => {
          scrub.setTargetSceneId(null);
        },
      );
    },
    [scrub, span, selectScene, selectDancer],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
