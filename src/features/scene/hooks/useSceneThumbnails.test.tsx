import { afterEach, describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { useSceneThumbnails } from "./useSceneThumbnails";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { DEFAULT_PREFERENCE } from "@/features/theme/lib/themePreference";
import { makeDancer, makePosition, makeProject, makeScene } from "@/test/factories";

const PROJECT = makeProject({ stageWidth: 10, stageHeight: 10 });

function Harness() {
  useSceneThumbnails(PROJECT);
  return null;
}

/** テーマが持っている色をjsdom上で再現する。themes.cssは読み込まれないので、
 * <html>のインラインスタイルに直接置く(getComputedStyleはこれを拾う) */
function setThemeColor(value: string) {
  document.documentElement.style.setProperty("--dancer-1", value);
}

function thumbnailOf(sceneId: string): string | undefined {
  return useProjectStore.getState().thumbnailBySceneId[sceneId];
}

afterEach(() => {
  document.documentElement.style.removeProperty("--dancer-1");
  useThemeStore.setState({
    preference: DEFAULT_PREFERENCE,
    projectId: null,
    isLoaded: false,
  });
});

describe("useSceneThumbnails", () => {
  it("配置からミニチュアを作ってストアに入れる", () => {
    setThemeColor("rgb(1, 2, 3)");
    useProjectStore.setState({
      scenes: [makeScene()],
      dancers: { "dancer-1": makeDancer({ color: "#3b82f6" }) },
      positionsBySceneId: { "scene-1": { "dancer-1": makePosition() } },
    });

    render(<Harness />);

    expect(decodeURIComponent(thumbnailOf("scene-1") ?? "")).toContain(
      'fill="rgb(1, 2, 3)"',
    );
  });

  // リグレッションテスト:
  // 色はdataURLに焼かれるため、<img>の中からは親のCSS変数が見えない。
  // テーマを見ずに作ると、テーマを変えても点の色だけが前のまま残る
  it("テーマが変わると、焼いた色も作り直す", () => {
    setThemeColor("rgb(1, 2, 3)");
    useProjectStore.setState({
      scenes: [makeScene()],
      dancers: { "dancer-1": makeDancer({ color: "#3b82f6" }) },
      positionsBySceneId: { "scene-1": { "dancer-1": makePosition() } },
    });

    render(<Harness />);
    const before = thumbnailOf("scene-1");

    act(() => {
      // 実際のテーマ切り替えでも、<html>の属性が変わってCSS変数の実測値が
      // 変わる。ここではその結果だけを再現している
      setThemeColor("rgb(9, 9, 9)");
      useThemeStore.setState({
        preference: { ...DEFAULT_PREFERENCE, theme: "paper" },
      });
    });

    expect(thumbnailOf("scene-1")).not.toBe(before);
    expect(decodeURIComponent(thumbnailOf("scene-1") ?? "")).toContain(
      'fill="rgb(9, 9, 9)"',
    );
  });

  it("配置が動くと作り直す", () => {
    setThemeColor("rgb(1, 2, 3)");
    useProjectStore.setState({
      scenes: [makeScene()],
      dancers: { "dancer-1": makeDancer({ color: "#3b82f6" }) },
      positionsBySceneId: { "scene-1": { "dancer-1": makePosition() } },
    });

    render(<Harness />);
    const before = thumbnailOf("scene-1");

    act(() => {
      useProjectStore
        .getState()
        .updateDancerPosition("scene-1", "dancer-1", { xCoordinate: 9 });
    });

    expect(thumbnailOf("scene-1")).not.toBe(before);
  });
});
