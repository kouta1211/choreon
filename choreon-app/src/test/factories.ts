import type { Dancer } from '@/features/dancer/types';
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

export function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return {
    id: 'dancer-1',
    projectId: 'project-1',
    name: 'あいり',
    color: '#3b82f6',
    initialDirection: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
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
