import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import type { Project } from "@/features/project/types";

/**
 * テスト用のドメインオブジェクトを作る。
 *
 * 同じ形のファクトリが各テストファイルに1つずつ書かれていて、Dancerに項目が
 * 1つ増えるだけで8ファイルが同時に壊れていた。既定値をここへ集めて、
 * テスト側は「そのテストで意味のある値」だけをoverridesで渡す。
 *
 * ステージの広さのように、ファイルごとに前提が違うもの(8×8で座標を数えている
 * テストと15×10のテスト)は、呼び出し側で1行のラッパーを作って上書きする。
 * ここで無理に1つの既定値へ揃えると、座標の期待値が静かにずれる。
 */

export function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return {
    id: "dancer-1",
    projectId: "project-1",
    name: "あいり",
    color: "#3b82f6",
    initialDirection: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    title: "発表会A",
    stageWidth: 15,
    stageHeight: 10,
    musicOffsetSeconds: 0,
    bpm: 120,
    beatsPerBar: 4,
    shareToken: null,
    isShared: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    projectId: "project-1",
    name: "シーン1",
    orderIndex: 0,
    timeSeconds: 0,
    ...overrides,
  };
}

export function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    sceneId: "scene-1",
    dancerId: "dancer-1",
    xCoordinate: 2,
    yCoordinate: 2,
    rotationAngle: 0,
    ...overrides,
  };
}
