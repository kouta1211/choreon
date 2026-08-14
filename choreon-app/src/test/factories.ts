import type { Position } from '@/features/scene/types';

/**
 * テスト用の値を作るところ。**Web版 `src/test/factories.ts` から、
 * ネイティブ版で要るものだけ**を写している（いまは立ち位置1つ）。
 * 既定値も Web版と同じにしてある — 履歴のテストを両方で同じ形にするため。
 */
export function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    sceneId: 'scene-1',
    dancerId: 'dancer-1',
    xCoordinate: 2,
    yCoordinate: 2,
    rotationAngle: 0,
    ...overrides,
  };
}
