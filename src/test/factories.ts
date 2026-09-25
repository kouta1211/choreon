import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import type { Project } from "@/features/project/types";
import {
  beatAtSeconds,
  DEFAULT_PLACEMENTS,
  durationBeats,
  withDerivedTimes,
} from "@/features/music/lib/placement";

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

/**
 * `bpm` と `musicPlacements` は**同じ物差しを指していなければならない**。
 * アプリ側は `setBpm`（＝`regrid`）が揃えているので、テストでも
 * `bpm` を渡しただけで載せ方が付いてくるようにする。
 * 両方を別々に試したいときは `musicPlacements` も明示的に渡す。
 */
export function makeProject(overrides: Partial<Project> = {}): Project {
  const bpm = overrides.bpm ?? 120;
  return {
    id: "project-1",
    userId: "user-1",
    title: "発表会A",
    stageWidth: 15,
    stageHeight: 10,
    musicTitle: null,
    musicPath: null,
    bpm,
    beatsPerBar: 4,
    isMetronomeEnabled: false,
    musicPlacements: [
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 60 / bpm },
    ],
    shareToken: null,
    isShared: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * テストは**秒で書かれている**（`makeScene({ timeSeconds: 4 })`）。
 * 正が拍へ移ったあともその書き方を残せるよう、**秒から拍を導く**。
 * 拍で書きたいテストは `positionBeats` を直に渡せばよい。
 *
 * 物差しは既定（BPM 120 = 1拍 0.5秒）。別の物差しを試すテストは
 * `withDerivedTimes` を自分で呼ぶ。
 */
export function makeScene(overrides: Partial<Scene> = {}): Scene {
  const timeSeconds = overrides.timeSeconds ?? 0;
  const moveSeconds = overrides.moveSeconds ?? null;
  const positionBeats =
    overrides.positionBeats ?? beatAtSeconds(DEFAULT_PLACEMENTS, timeSeconds);
  return withDerivedTimes(
    [
      {
        id: "scene-1",
        projectId: "project-1",
        name: "シーン1",
        orderIndex: 0,
        ...overrides,
        positionBeats,
        moveBeats:
          overrides.moveBeats ??
          (moveSeconds === null
            ? null
            : durationBeats(DEFAULT_PLACEMENTS, positionBeats, moveSeconds)),
      },
    ],
    DEFAULT_PLACEMENTS,
  )[0];
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
