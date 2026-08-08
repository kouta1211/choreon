import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SceneTabs } from "./SceneTabs";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    projectId: "project-1",
    name: "シーン1",
    orderIndex: 0,
    transitionDurationSeconds: 1,
    ...overrides,
  };
}

function makeDancer(): Dancer {
  return {
    id: "dancer-1",
    projectId: "project-1",
    name: "あいり",
    color: "#3b82f6",
    initialDirection: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    sceneId: "scene-1",
    dancerId: "dancer-1",
    xCoordinate: 2,
    yCoordinate: 2,
    rotationAngle: 0,
    ...overrides,
  };
}

const SCENES = [
  makeScene(),
  makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1 }),
];

function renderSceneTabs(
  selectedSceneId: string,
  onSelectScene: (sceneId: string) => void,
) {
  return render(
    <SceneTabs
      scenes={SCENES}
      selectedSceneId={selectedSceneId}
      onSelectScene={onSelectScene}
      onAddScene={() => {}}
      onReorderScenes={() => {}}
      isPlaying={false}
      onTogglePlay={() => {}}
      isCreating={false}
      dancers={{ "dancer-1": makeDancer() }}
      positionsBySceneId={{
        "scene-1": { "dancer-1": makePosition() },
        "scene-2": {
          "dancer-1": makePosition({ sceneId: "scene-2", xCoordinate: 6 }),
        },
      }}
      stageWidthUnits={8}
      stageHeightUnits={8}
    />,
  );
}

/**
 * スクロールで選択が切り替わる仕組みのテスト。
 *
 * jsdomではgetBoundingClientRectが常に0を返すため、「左端に一番近いコマ」の
 * 距離計算そのものは検証できない(全コマが距離0になり、必ず先頭のコマが
 * 選ばれる)。ここで確かめたいのはその計算精度ではなく、
 * 「どういう時に選択を上書きし、どういう時に上書きしないか」という
 * 場合分けの方なので、この制約があっても意味のあるテストになる。
 */
describe("SceneTabs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // リグレッションテスト:
  // 選択が変わると、そのコマが見えるところまで自動でスクロールする。
  // その自動スクロール自体もscrollイベントを発生させるため、素直に実装すると
  // 「選択が変わる→自動スクロール→スクロールを検知して別のコマを選び直す」
  // という取り合いが起き、クリックしたのと違うシーンが選ばれたり、
  // 再生が1歩で止まったりしていた
  it("選択変更にともなう自動スクロールでは、選択を上書きし返さない", () => {
    const onSelectScene = vi.fn();
    const { rerender } = renderSceneTabs("scene-1", onSelectScene);

    // 選択がscene-2へ変わる = 自動スクロールが始まる状況
    rerender(
      <SceneTabs
        scenes={SCENES}
        selectedSceneId="scene-2"
        onSelectScene={onSelectScene}
        onAddScene={() => {}}
        onReorderScenes={() => {}}
        isPlaying={false}
        onTogglePlay={() => {}}
        isCreating={false}
        dancers={{ "dancer-1": makeDancer() }}
        positionsBySceneId={{
          "scene-1": { "dancer-1": makePosition() },
          "scene-2": {
            "dancer-1": makePosition({ sceneId: "scene-2", xCoordinate: 6 }),
          },
        }}
        stageWidthUnits={8}
        stageHeightUnits={8}
      />,
    );

    fireEvent.scroll(screen.getByTestId("scene-strip"));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSelectScene).not.toHaveBeenCalled();
  });

  it("ユーザー自身のスクロール(ホイール操作)なら、スクロール位置のコマを選択する", () => {
    const onSelectScene = vi.fn();
    renderSceneTabs("scene-2", onSelectScene);

    const strip = screen.getByTestId("scene-strip");
    // ホイールは「これは自動スクロールではない」という合図になる
    fireEvent.wheel(strip);
    fireEvent.scroll(strip);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // jsdomでは全コマの座標が0になるため、必ず先頭のコマが最寄りと判定される
    expect(onSelectScene).toHaveBeenCalledWith("scene-1");
  });
});
