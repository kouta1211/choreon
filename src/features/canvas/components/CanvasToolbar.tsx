"use client";

import { useUIStore } from "@/features/canvas/store/useUIStore";
import { Switch } from "@/components/ui/Switch";

/**
 * ステージ上部のトグル行(シンメトリーモード/導線を表示/顔被りチェック)。
 * すべてuseUIStoreのフラグをそのまま切り替えるだけなので、propsを取らず
 * ストアに直接つなぐ自己完結コンポーネントにしている。
 */
export function CanvasToolbar() {
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
    </div>
  );
}
