"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  resolveTransitionDuration,
  SCENE_TRANSITION_EASE,
} from "@/features/canvas/constants";
import type { Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  isPlaying: boolean;
};

/**
 * 曲全体のどこを見ているかを示すレール。目盛りがシーン、丸が現在地。
 *
 * 再生中は、現在地の丸がシーンからシーンへ【滑らかに】移動する。
 * コマ送りのように飛ぶのではなく、ダンサーの動きと同じ秒数・同じ
 * イージングで進むので、レールを見れば「今どのくらい進んだか」が分かる。
 *
 * 位置はシーンの番号を単位にした値(0〜最後の番号)で持ち、％に直して
 * 描いている。再生中はダンサーが「1つ前のシーンから今のシーンへ」
 * 動いている最中なので、丸もその区間を進む(選択が切り替わった瞬間に
 * 目的地へ飛ばない)。
 *
 * 進捗はReactのstateにせずMotionValueで持ち、styleへ直接流している。
 * 毎フレームの再レンダーを避けるためで、ステージ上のダンサーや
 * 導線の演出と同じ方針。
 *
 * 見た目はレールだが、中身は今までどおり<input type="range">を透明にして
 * 重ねている。範囲入力はドラッグ・矢印キー・Home/End・スクリーンリーダーの
 * 読み上げをブラウザが最初から備えており、それを自前のポインタ処理で
 * 書き直すと必ず取りこぼす。
 */
export function SceneDotRail({
  scenes,
  selectedIndex,
  onSelectIndex,
  isPlaying,
}: Props) {
  const lastIndex = scenes.length - 1;
  const position = useMotionValue(Math.max(0, selectedIndex));
  const percent = useTransform(position, (value) =>
    lastIndex > 0 ? `${(value / lastIndex) * 100}%` : "0%",
  );
  // 再生中に進む区間の長さ。「このシーンへ入ってくるのにかかる秒数」なので、
  // 動いているのは1つ前のシーンから今のシーンまで
  const currentDurationSeconds =
    scenes[selectedIndex]?.transitionDurationSeconds ?? 0;

  useEffect(() => {
    if (selectedIndex < 0) return;

    if (!isPlaying) {
      position.set(selectedIndex);
      return;
    }

    position.set(Math.max(0, selectedIndex - 1));
    const animation = animate(position, selectedIndex, {
      duration: resolveTransitionDuration(currentDurationSeconds),
      ease: SCENE_TRANSITION_EASE,
    });
    return () => animation.stop();
  }, [isPlaying, selectedIndex, currentDurationSeconds, position]);

  if (scenes.length <= 1) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 pt-3">
      <div className="relative h-[11px] flex-1">
        {/* 未通過のレール */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 block h-[3px] -translate-y-1/2 rounded-full bg-zinc-700"
        />
        {/* 通過済み */}
        <motion.span
          aria-hidden
          style={{ width: percent }}
          className="absolute top-1/2 left-0 block h-[3px] -translate-y-1/2 rounded-full bg-pink-500"
        />
        {/* シーンの目盛り。区間の切れ目が分かるようにする */}
        {scenes.map((scene, index) => (
          <span
            key={scene.id}
            aria-hidden
            className="absolute top-1/2 block h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500"
            style={{ left: `${(index / lastIndex) * 100}%` }}
          />
        ))}
        {/* 現在地 */}
        <motion.span
          aria-hidden
          style={{ left: percent }}
          className="absolute top-1/2 block h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.25)]"
        />

        <input
          type="range"
          name="scene-index"
          aria-label="シーンを切り替える"
          min={0}
          max={lastIndex}
          step={1}
          value={selectedIndex < 0 ? 0 : selectedIndex}
          onChange={(event) => onSelectIndex(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="shrink-0 font-mono text-[10px] font-medium text-zinc-600">
        {selectedIndex + 1}/{scenes.length}
      </span>
    </div>
  );
}
