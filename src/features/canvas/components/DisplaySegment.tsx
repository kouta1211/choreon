"use client";

import { Eclipse, Eye, Grid3x3, Spline, UserPlus } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * ステージに何を重ねて表示するかの3連セグメント(グリッド・導線・顔被り)。
 *
 * 旧CanvasToolbarではラベル付きのトグルスイッチが4つ並び、横に約280px
 * 使って2行に折り返していた。ここはステージのすぐ上という一等地なので、
 * アイコンだけのセグメントにして92pxに収める。
 * 先頭の目のアイコンが「この列は"見え方"の設定である」ことを示す見出しの
 * 役割を果たす。ただしアイコン単体では何のトグルか初見で分からないため、
 * ホバー/フォーカスで名前を出す(Tooltip)。押せば結果は分かるが、
 * 押す前に分かる必要がある。
 *
 * 挙動そのものを変えるシンメトリーモードはここには入れない
 * (StageModePillとしてヘッダーに分けている)。
 */
export function DisplaySegment() {
  const isGridVisible = useUIStore((state) => state.isGridVisible);
  const toggleGrid = useUIStore((state) => state.toggleGrid);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const toggleBlindSpotCheckVisible = useUIStore(
    (state) => state.toggleBlindSpotCheckVisible,
  );
  const dancerCount = useProjectStore(
    (state) => Object.keys(state.dancers).length,
  );
  const sceneCount = useProjectStore((state) => state.scenes.length);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );

  const items = [
    {
      label: "グリッドを表示",
      icon: Grid3x3,
      checked: isGridVisible,
      onChange: toggleGrid,
    },
    {
      label: "導線を表示",
      icon: Spline,
      checked: isPathVisible,
      onChange: togglePathVisible,
    },
    {
      label: "顔被りチェック",
      icon: Eclipse,
      checked: isBlindSpotCheckVisible,
      onChange: toggleBlindSpotCheckVisible,
    },
  ];

  return (
    <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-2">
      <Eye size={15} className="shrink-0 text-zinc-600" aria-hidden />
      {/* overflow-hiddenで角を丸めると吹き出しまで切られてしまうので、
          両端のボタン側で角を丸めている */}
      <div className="flex shrink-0 rounded-[10px] border border-zinc-700">
        {items.map((item, index) => (
          <Tooltip key={item.label} label={item.label}>
            <button
              type="button"
              role="switch"
              aria-checked={item.checked}
              aria-label={item.label}
              onClick={item.onChange}
              className={`flex h-8 w-11 items-center justify-center transition-colors ${
                index === 0 ? "rounded-l-[9px]" : ""
              } ${
                index === items.length - 1
                  ? "rounded-r-[9px]"
                  : "border-r border-zinc-700"
              } ${
                item.checked ? "bg-pink-500/16 text-pink-400" : "text-zinc-500"
              }`}
            >
              <item.icon size={16} />
            </button>
          </Tooltip>
        ))}
      </div>
      {/* ダンサーの追加はプロジェクト単位の操作なので、シーンを扱うドック
          ではなく、人数を表示しているこの行に置く */}
      <span className="ml-auto">
        <Tooltip label="ダンサーを追加">
          <button
            type="button"
            onClick={() => setAddDancerSheetOpen(true)}
            aria-label="ダンサーを追加"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400"
          >
            <UserPlus size={16} />
          </button>
        </Tooltip>
      </span>
      <span className="shrink-0 font-mono text-[10px] text-zinc-500">
        {dancerCount}人 · {sceneCount}シーン
      </span>
    </div>
  );
}
