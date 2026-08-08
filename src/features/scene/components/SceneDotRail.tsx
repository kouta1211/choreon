"use client";

import type { Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
};

/**
 * 曲全体のどこを見ているかを示すレール。区間バーが並び、現在地だけが
 * 点になる。右端に「3/5」。
 *
 * 見た目はレールだが、中身は今までどおり<input type="range">を透明にして
 * 重ねている。範囲入力はドラッグ・矢印キー・Home/End・スクリーンリーダーの
 * 読み上げをブラウザが最初から備えており、それを自前のポインタ処理で
 * 書き直すと必ず取りこぼす。見た目だけ差し替えるのが一番安全。
 */
export function SceneDotRail({ scenes, selectedIndex, onSelectIndex }: Props) {
  if (scenes.length <= 1) return null;

  return (
    <div className="relative flex items-center gap-[7px] px-4 pt-3">
      {scenes.map((scene, index) => {
        const isCurrent = index === selectedIndex;
        if (isCurrent) {
          return (
            <span
              key={scene.id}
              aria-hidden
              className="block h-[11px] w-[11px] shrink-0 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.25)]"
            />
          );
        }
        return (
          <span
            key={scene.id}
            aria-hidden
            className={`block h-[3px] flex-1 rounded-sm ${
              index < selectedIndex ? "bg-pink-500" : "bg-zinc-700"
            }`}
          />
        );
      })}
      <span className="shrink-0 font-mono text-[10px] font-medium text-zinc-600">
        {selectedIndex + 1}/{scenes.length}
      </span>

      <input
        type="range"
        name="scene-index"
        aria-label="シーンを切り替える"
        min={0}
        max={scenes.length - 1}
        step={1}
        value={selectedIndex < 0 ? 0 : selectedIndex}
        onChange={(event) => onSelectIndex(Number(event.target.value))}
        // 目盛りの数字ぶん右に余白を空け、レール部分だけに重ねる
        className="absolute inset-y-0 left-4 right-10 h-full w-auto cursor-pointer opacity-0"
      />
    </div>
  );
}
