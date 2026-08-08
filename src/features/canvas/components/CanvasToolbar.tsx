"use client";

import { useUIStore } from "@/features/canvas/store/useUIStore";
import { HistoryControls } from "@/features/canvas/components/HistoryControls";
import { Switch } from "@/components/ui/Switch";

/**
 * ステージ上部の操作行。左側に表示切り替えのトグル、右側に元に戻す/やり直す。
 * トグルはすべてuseUIStoreのフラグをそのまま切り替えるだけなので、propsを
 * 取らずストアに直接つなぐ自己完結コンポーネントにしている。
 */
export function CanvasToolbar() {
  const isGridVisible = useUIStore((state) => state.isGridVisible);
  const toggleGrid = useUIStore((state) => state.toggleGrid);
  const isSymmetryMode = useUIStore((state) => state.isSymmetryMode);
  const toggleSymmetryMode = useUIStore((state) => state.toggleSymmetryMode);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isBlindSpotCheckVisible = useUIStore(
    (state) => state.isBlindSpotCheckVisible,
  );
  const toggleBlindSpotCheckVisible = useUIStore(
    (state) => state.toggleBlindSpotCheckVisible,
  );

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Switch
          checked={isSymmetryMode}
          onChange={toggleSymmetryMode}
          label="シンメトリーモード"
        />
        <Switch
          checked={isPathVisible}
          onChange={togglePathVisible}
          label="導線を表示"
        />
        <Switch
          checked={isBlindSpotCheckVisible}
          onChange={toggleBlindSpotCheckVisible}
          label="顔被りチェック"
        />
        {/* グリッド表示の切り替えはストア側(isGridVisible)に前からあったが、
            それを操作するUIがどこにも無く、常時オンのままだった */}
        <Switch
          checked={isGridVisible}
          onChange={toggleGrid}
          label="グリッドを表示"
        />
      </div>
      <HistoryControls />
    </div>
  );
}
