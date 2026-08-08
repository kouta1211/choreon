"use client";

import { useEffect, useRef, useState } from "react";
import { Eclipse, FlipHorizontal2, Grid3x3, SlidersHorizontal, Spline } from "lucide-react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { Switch } from "@/components/ui/Switch";

/**
 * ステージの見え方とモードをまとめて切り替えるメニュー。ヘッダー右端の
 * ボタンから開く。
 *
 * 最初はステージの上にアイコンだけのセグメントを常設していたが、
 * アイコン単体では何のトグルか分からず、ホバーで名前を出しても
 * ポインタの無いスマートフォンでは解決しなかった。
 * 畳んでメニューにすれば、開いたときに全部の名前が読める。
 * ステージの上に常設していた1行(約48px)も返せるので、狭い画面ほど得になる。
 *
 * 畳んだことで各モードのオン/オフがひと目で分からなくなるが、
 * グリッド・導線・中心線はステージ自体に出るので実害は小さい。
 * 唯一「顔被りチェックがオンだが誰も被っていない」状態だけは
 * 見分けが付かないため、オンの数をボタンにバッジで出している。
 */
export function DisplayModeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);
  const toggleSymmetryMode = useUIStore((state) => state.toggleSymmetryMode);
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const modes = [
    {
      label: "シンメトリーモード",
      description: "動かすと左右の相手も連動する",
      icon: FlipHorizontal2,
      checked: isSymmetryMode,
      onChange: toggleSymmetryMode,
    },
    {
      label: "グリッドを表示",
      description: "1マス=約90cm",
      icon: Grid3x3,
      checked: isGridVisible,
      onChange: toggleGrid,
    },
    {
      label: "導線を表示",
      description: "次のシーンへの動きを線で描く",
      icon: Spline,
      checked: isPathVisible,
      onChange: togglePathVisible,
    },
    {
      label: "顔被りチェック",
      description: "手前の人に隠れる人を赤くする",
      icon: Eclipse,
      checked: isBlindSpotCheckVisible,
      onChange: toggleBlindSpotCheckVisible,
    },
  ];
  const activeCount = modes.filter((mode) => mode.checked).length;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="表示とモード"
        className={`relative flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors ${
          isOpen
            ? "border-pink-500 bg-pink-500/12 text-pink-400"
            : "border-zinc-700 text-zinc-400"
        }`}
      >
        <SlidersHorizontal size={17} />
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 font-mono text-[9px] font-semibold text-white"
          >
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* 外側をタップしても閉じられるようにする。メニューより手前に
              置くと中身が押せなくなるので、z順はメニューの下 */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            aria-label="表示とモード"
            className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
          >
            <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500">
                表示とモード
              </span>
              <span className="font-mono text-[10px] text-zinc-600">
                {dancerCount}人 · {sceneCount}シーン
              </span>
            </div>
            {modes.map((mode) => (
              <Switch
                key={mode.label}
                checked={mode.checked}
                onChange={mode.onChange}
                label={mode.label}
                description={mode.description}
                icon={mode.icon}
                fullWidth
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
