"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  resolveTransitionDuration,
  SCENE_TRANSITION_EASE,
} from "@/features/canvas/constants";
import type { Scene } from "@/features/scene/types";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";

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
 * 目盛りは【時刻に比例して】置く。シーンの番号で等間隔に並べると、
 * 0秒・5秒・5.1秒・6秒のような配置が均等に見えてしまい、
 * 「どこが詰まっているか」というレール本来の情報が消える。
 *
 * 位置は0〜1の割合で持ち、％に直して描いている。再生中はダンサーが
 * 「1つ前のシーンから今のシーンへ」動いている最中なので、丸もその区間を
 * 進む(選択が切り替わった瞬間に目的地へ飛ばない)。
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
  // 各シーンがレール上のどこに来るか(0〜1)。時刻の差をそのまま比率にする
  const fractions = sceneTimeFractions(scenes);
  // 依存配列に配列そのものを置くと毎レンダー別物になる。中身で比べる
  const fractionsKey = fractions.join();
  const position = useMotionValue(fractions[Math.max(0, selectedIndex)] ?? 0);
  const percent = useTransform(position, (value) => `${value * 100}%`);
  // 再生中に進む区間の長さ。「このシーンへ入ってくるのにかかる秒数」なので、
  // 動いているのは1つ前のシーンから今のシーンまで
  const currentDurationSeconds = sceneDurations(scenes)[selectedIndex] ?? 0;

  useEffect(() => {
    if (selectedIndex < 0) return;

    const target = fractions[selectedIndex] ?? 0;
    if (!isPlaying) {
      position.set(target);
      return;
    }

    position.set(fractions[Math.max(0, selectedIndex - 1)] ?? 0);
    const animation = animate(position, target, {
      duration: resolveTransitionDuration(currentDurationSeconds),
      ease: SCENE_TRANSITION_EASE,
    });
    return () => animation.stop();
    // fractions は毎レンダー新しい配列になるが、中身が同じなら
    // アニメーションを張り直す必要はない。文字列にして比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlaying,
    selectedIndex,
    currentDurationSeconds,
    position,
    fractionsKey,
  ]);

  if (scenes.length <= 1) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 pt-3">
      <div className="relative h-[11px] flex-1">
        {/* 未通過のレール */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 block h-[3px] -translate-y-1/2 rounded-full bg-line-strong"
        />
        {/* 通過済み */}
        <motion.span
          aria-hidden
          style={{ width: percent }}
          className="absolute top-1/2 left-0 block h-[3px] -translate-y-1/2 rounded-full bg-accent"
        />
        {/* シーンの目盛り。区間の切れ目が分かるようにする */}
        {scenes.map((scene, index) => (
          <span
            key={scene.id}
            aria-hidden
            className="absolute top-1/2 block h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-muted"
            style={{ left: `${fractions[index] * 100}%` }}
          />
        ))}
        {/* 現在地 */}
        <motion.span
          aria-hidden
          style={{ left: percent }}
          className="absolute top-1/2 block h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
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
      <span className="shrink-0 font-mono text-[10px] font-medium text-fg-muted">
        {selectedIndex + 1}/{scenes.length}
      </span>
    </div>
  );
}

/** 各シーンがレール上のどこに来るか(0〜1)。
 * 先頭を0、最後を1として、間は時刻の差に比例させる。
 * 全部が同じ時刻(長さ0)のときは等間隔へ落とす — 0除算を避けつつ、
 * 目盛りが1点に重なって数えられなくなるのも防ぐ */
function sceneTimeFractions(scenes: Scene[]): number[] {
  if (scenes.length === 0) return [];
  const first = scenes[0].timeSeconds;
  const span = scenes[scenes.length - 1].timeSeconds - first;
  if (span <= 0) {
    const last = Math.max(1, scenes.length - 1);
    return scenes.map((_, index) => index / last);
  }
  return scenes.map((scene) => (scene.timeSeconds - first) / span);
}
