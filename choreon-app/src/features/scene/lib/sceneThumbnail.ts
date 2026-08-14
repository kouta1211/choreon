import type { Dancer } from '@/features/dancer/types';
import type { Position } from '@/features/scene/types';
import { toScreenY } from '@/features/canvas/lib/stageFlip';

/** ミニチュアの中の点1つ。位置は0〜1の割合で持つ（実際の表示px数は
 * 置き場所によって違うため、ここでは決めない） */
export type ThumbnailDot = {
  /** 左からの位置（0〜1） */
  x: number;
  /** 上からの位置（0〜1） */
  y: number;
  /** 実際に塗る色 */
  color: string;
};

/**
 * シーン1コマ分の点の位置と色を出す。**Web版から関数ごとコピー**（テストも）。
 *
 * ■ Web版にある「SVGを dataURL に焼く」ほうは持ってきていない
 * あちらは人数×シーン数ぶんの要素を並べる代わりに、シーンごとに画像1枚へ
 * 焼いている。**React Native ではその必要が無い** — react-native-svg の
 * `<Circle>` をそのまま並べればよく、色も props で渡すので文字列を組み立て
 * ない（属性から抜け出せる記号を落とす細工も要らなくなる）。
 *
 * 色の読み替えをここでやらないのは Web版と同じ。「実際の色に直す関数」を
 * 受け取ることで、この関数自体は純関数のままでいられる。
 */
export function buildThumbnailDots(
  positions: Record<string, Position>,
  dancers: Record<string, Dancer>,
  stageWidthUnits: number,
  stageHeightUnits: number,
  resolveColor: (dancerColor: string) => string,
  /** 客席を上にして描くか。ステージと向きが違うミニチュアは、
   * 見比べるためのものなのに見比べられない */
  isAudienceOnTop = false,
): ThumbnailDot[] {
  const dots: ThumbnailDot[] = [];

  for (const position of Object.values(positions)) {
    const dancer = dancers[position.dancerId];
    // 削除されたダンサーの配置が残っていることがある。描くものが無い
    if (!dancer) continue;

    dots.push({
      x: position.xCoordinate / stageWidthUnits,
      y:
        toScreenY(position.yCoordinate, stageHeightUnits, isAudienceOnTop) /
        stageHeightUnits,
      color: resolveColor(dancer.color),
    });
  }

  return dots;
}
