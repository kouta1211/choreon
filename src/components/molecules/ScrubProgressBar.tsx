"use client";

import { useEffect, useRef } from "react";
import { useSceneScrub } from "@/features/canvas/hooks/useSceneScrub";
import { useProjectStore } from "@/features/project/store/useProjectStore";

/**
 * ステージを払っている間だけ出る、隊形モーフの進み具合。
 *
 * 「あとどれだけ引けば隣のシーンへ行くのか」は、指の感触だけでは分からない。
 * 確定のしきい値(1シーンぶんの22%)を越えたかどうかで、手を離した結果が
 * 変わってしまうため、数字と色で越えたことを示す。
 *
 * 掴んでいない間は何も描かない。常設のバーにすると、このアプリで最も
 * 貴重な縦の余白を、ほとんどの時間なにも起きない行のために使うことになる
 * (EditorLayoutの高さの組み立てを参照)。
 *
 * 進捗はMotionValueから直接DOMへ書いている。stateを経由すると
 * pointermoveのたびにこのコンポーネントが再レンダーされる
 */
export function ScrubProgressBar() {
  const scrub = useSceneScrub();
  const scenes = useProjectStore((state) => state.scenes);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const targetSceneId = scrub?.targetSceneId ?? null;
  const isActive = targetSceneId !== null;

  useEffect(() => {
    if (!scrub || !isActive) return;
    const apply = (progress: number) => {
      const percent = Math.round(progress * 100);
      if (fillRef.current) fillRef.current.style.width = `${percent}%`;
      if (labelRef.current) labelRef.current.textContent = `${percent}%`;
    };
    apply(scrub.progress.get());
    return scrub.progress.on("change", apply);
  }, [scrub, isActive]);

  if (!isActive) return null;

  const target = scenes.find((scene) => scene.id === targetSceneId);

  // 上端に置いている。下端はテンプレートのヒントやダンサーのインスペクターが
  // 浮いてくる場所で、そちらに隠れてしまう
  return (
    <div
      aria-hidden
      data-testid="scrub-progress"
      className="pointer-events-none absolute inset-x-0 top-1 flex justify-center px-4"
    >
      {/* ステージ面の上に浮くので、下に敷かないとダンサーや格子と重なって
          数字が読めなくなる */}
      <span className="flex max-w-full items-center gap-2.5 rounded-full border border-line bg-[color-mix(in_oklab,var(--surface-strong)_88%,transparent)] px-3 py-1.5 backdrop-blur-sm">
        <span className="max-w-[40%] truncate text-caption text-fg-sub">
          {target?.name}
        </span>
        {/* 溝は下地(surface-strong)と同じ色にすると消えるので一段沈める */}
        <span className="h-[3px] w-28 overflow-hidden rounded-full bg-surface-sunken">
          <span ref={fillRef} className="block h-full rounded-full bg-accent" />
        </span>
        <span
          ref={labelRef}
          className="w-9 text-right font-mono text-caption tabular-nums text-fg-muted"
        >
          0%
        </span>
      </span>
    </div>
  );
}
