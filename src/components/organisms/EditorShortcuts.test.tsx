import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { EditorShortcuts } from "./EditorShortcuts";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

/**
 * ダンサーは作品に属し、立ち位置はシーンに属する。ここでは
 * **「みなみ」だけ、このシーンに立っていない**状態を作る。
 */
function hydrate() {
  useProjectStore.getState().hydrate({
    project: makeProject(),
    dancers: [
      makeDancer({ id: "dancer-1", name: "あいり" }),
      makeDancer({ id: "dancer-2", name: "ゆい" }),
      makeDancer({ id: "dancer-3", name: "みなみ" }),
    ],
    scenes: [makeScene()],
    positions: [
      {
        sceneId: "scene-1",
        dancerId: "dancer-1",
        xCoordinate: 2,
        yCoordinate: 2,
        rotationAngle: 0,
      },
      {
        sceneId: "scene-1",
        dancerId: "dancer-2",
        xCoordinate: 6,
        yCoordinate: 2,
        rotationAngle: 0,
      },
    ],
    isGuest: true,
  });
  useUIStore.setState({ selectedSceneId: "scene-1" });
}

function pressSelectAll(options: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { key: "a", ctrlKey: true, ...options });
}

describe("EditorShortcuts の Ctrl/⌘ + A", () => {
  beforeEach(() => {
    hydrate();
  });

  it("いまのシーンに立っている人だけを選ぶ", () => {
    render(<EditorShortcuts />);

    pressSelectAll();

    // 立ち位置を持たない「みなみ」は入らない。選んでも整列も向きも効かないため
    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
    ]);
  });

  it("⌘ でも同じ（Mac）", () => {
    render(<EditorShortcuts />);

    fireEvent.keyDown(window, { key: "a", metaKey: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
    ]);
  });

  it("入力中は効かない（欄の中の全選択に譲る）", () => {
    render(<EditorShortcuts />);
    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: "a", ctrlKey: true, bubbles: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
    input.remove();
  });

  it("シートが開いている間は効かない", () => {
    render(<EditorShortcuts />);
    useUIStore.getState().setAddDancerSheetOpen(true);

    pressSelectAll();

    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
  });

  it("Alt を混ぜたときは効かない（別の担当に譲る）", () => {
    render(<EditorShortcuts />);

    pressSelectAll({ altKey: true });

    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
  });
});
