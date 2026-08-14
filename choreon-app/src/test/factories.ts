import type { Position, Scene } from '@/features/scene/types';

/**
 * テスト用の値を作るところ。**Web版 `src/test/factories.ts` から、
 * ネイティブ版で要るものだけ**を写している。既定値も Web版と同じ —
 * コピーしたテストをそのまま通すため。
 */
export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    projectId: 'project-1',
    name: 'シーン1',
    orderIndex: 0,
    timeSeconds: 0,
    ...overrides,
  };
}

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
