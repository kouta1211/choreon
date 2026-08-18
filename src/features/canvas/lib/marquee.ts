import { toScreenY } from "@/features/canvas/lib/stageFlip";
import type { Position } from "@/features/scene/types";

/** 画面の上で引いた枠。ステージの左上を原点とした px */
export type MarqueeBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 押した点と、いま指（カーソル）が居る点から枠を作る。
 *
 * どちら向きに引いても同じ枠になるように、小さい方を左上にする
 * （右下から左上へ引く人の方が少ないが、できないと不具合に見える）。
 */
export function marqueeBox(
  start: { x: number; y: number },
  current: { x: number; y: number },
): MarqueeBox {
  return {
    left: Math.min(start.x, current.x),
    top: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

/**
 * 枠の中に居る人。
 *
 * ■ 画面の向きで比べる
 * 立ち位置は「客席から見た向き」で持っているが、**客席を上にする**を
 * オンにしていると、画面では上下が入れ替わって描かれる（stageFlip）。
 * 枠は画面の上で引くものなので、比べる前に立ち位置の方を画面の向きへ写す。
 * ここを忘れると、上下を入れ替えている人にだけ「囲んだのと違う人が
 * 選ばれる」という壊れ方をする。
 *
 * ■ 中心が入っていれば選ぶ
 * 丸の一部でもかすれば選ぶ、にすると、隣を囲んだつもりで巻き込む。
 * 立ち位置（＝丸の中心）が枠に入っているかだけで決める。
 */
export function dancersInMarquee({
  positions,
  box,
  stageWidthPx,
  stageHeightPx,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
}: {
  positions: Record<string, Position>;
  /** ステージの左上を原点とした px の枠 */
  box: MarqueeBox;
  stageWidthPx: number;
  stageHeightPx: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
}): string[] {
  if (stageWidthPx === 0 || stageHeightPx === 0) return [];

  const toUnitsX = (px: number) => (px / stageWidthPx) * stageWidthUnits;
  const toUnitsY = (px: number) => (px / stageHeightPx) * stageHeightUnits;

  const left = toUnitsX(box.left);
  const right = toUnitsX(box.left + box.width);
  const top = toUnitsY(box.top);
  const bottom = toUnitsY(box.top + box.height);

  return Object.entries(positions)
    .filter(([, position]) => {
      const x = position.xCoordinate;
      const y = toScreenY(position.yCoordinate, stageHeightUnits, isAudienceOnTop);
      return x >= left && x <= right && y >= top && y <= bottom;
    })
    .map(([dancerId]) => dancerId);
}
