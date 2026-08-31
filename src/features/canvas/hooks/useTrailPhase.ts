"use client";

import { useState } from "react";

type Args = {
  /** いま見ているシーン */
  selectedSceneId: string | null;
  /** 隣り合うシーン同士の移動か。飛んだなら跡は出さない */
  isAdjacentStep: boolean;
  isPathVisible: boolean;
  /**
   * 再生しているか。
   *
   * ⚠️ **再生を押した時点でも跡を出す**（2026-08-31）。
   * 跡は「シーンが変わった」ときだけ出していたが、
   * **再生中は押した瞬間から今の区間を動き始める**（`lib/stageStep`）ので、
   * 最初の1区間だけ跡が出ず、区間の線が**丸ごと残り続けて**いた
   * （user の報告「完全に移動しきるまで、すべて残り続けてる」）。
   */
  isPlaying: boolean;
};

type TrailPhase = {
  /**
   * 通った跡(PathTrail)を出している最中か。
   *
   * **導線は必ずどちらか一方**にする。移動の最中は跡だけ、止まっている間は
   * 区間の線(PathOverlay)だけ。両方出すと、手前で跡が消えていく最中に
   * 次の区間の線が全部そろって現れ、**2組の点線が同時に動いて見える**。
   */
  isTrailAnimating: boolean;
  /** 跡が描き終わったときに呼ぶ。通常の導線表示へ引き継ぐ */
  onTrailComplete: () => void;
};

/**
 * シーンを移った直後だけ「通った跡」を出す、という段を管理する。
 *
 * ■ なぜ useEffect ではないのか
 * useEffect だと「新しいシーンで1度描画されてから」フラグが立つため、
 * **1フレームだけ導線が全部見えてしまう**。props の変化に合わせて
 * レンダー中に state を調整する、React が公式に案内しているパターンで書く。
 */
export function useTrailPhase({
  selectedSceneId,
  isAdjacentStep,
  isPathVisible,
  isPlaying,
}: Args): TrailPhase {
  const [animatingSceneId, setAnimatingSceneId] = useState<string | null>(null);
  const [renderedSceneId, setRenderedSceneId] = useState(selectedSceneId);
  const [wasPlaying, setWasPlaying] = useState(isPlaying);

  if (renderedSceneId !== selectedSceneId) {
    setRenderedSceneId(selectedSceneId);
    setAnimatingSceneId(
      isAdjacentStep && isPathVisible ? selectedSceneId : null,
    );
  }

  /* 再生の入り切り。**始めた時点で、いまの区間の跡を出す** —
     再生中の移動はシーンが変わるのを待たずに始まるため。
     止めたときは畳む（止まっているのに跡が消えていくのはおかしい）。
     隣かどうかは見ない — 再生で向かう先は必ず次のシーン */
  if (wasPlaying !== isPlaying) {
    setWasPlaying(isPlaying);
    setAnimatingSceneId(isPlaying && isPathVisible ? selectedSceneId : null);
  }

  // 移動の途中で導線表示を切ると、PathTrail は描き終わりを知らせないまま
  // 消える。フラグが立ちっぱなしになり、次に導線を出したときに
  // 「もう終わった移動」の線が最初から描き直されてしまうため、ここで畳む
  if (!isPathVisible && animatingSceneId !== null) {
    setAnimatingSceneId(null);
  }

  return {
    isTrailAnimating:
      animatingSceneId !== null && animatingSceneId === selectedSceneId,
    onTrailComplete: () => setAnimatingSceneId(null),
  };
}
