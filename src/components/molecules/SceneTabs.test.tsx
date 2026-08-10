import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneTabs } from "./SceneTabs";

import { makeScene } from "@/test/factories";

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
      onReorderScenes={() => {}}
      onDeleteScene={() => {}}
      thumbnailBySceneId={{}}
      stageWidthUnits={8}
      stageHeightUnits={8}
    />,
  );
}

describe("SceneTabs", () => {
  it("コマを押すとそのシーンを選択する", async () => {
    const onSelectScene = vi.fn();
    const user = userEvent.setup();
    renderSceneTabs("scene-1", onSelectScene);

    await user.click(screen.getByText("シーン2"));

    expect(onSelectScene).toHaveBeenCalledWith("scene-2");
  });

  // リグレッションテスト:
  // 以前は「スクロールが止まった位置に一番近いコマ」を自動で選択していた。
  // 一覧を眺めようと横に払っただけで選択が変わり、再生も止まっていたため外した。
  // スクロールは移動手段であって、選択の意思表示ではない
  it("横スクロールしただけでは選択を変えない", () => {
    const onSelectScene = vi.fn();
    renderSceneTabs("scene-1", onSelectScene);

    const strip = screen.getByTestId("scene-strip");
    fireEvent.wheel(strip);
    fireEvent.scroll(strip);

    expect(onSelectScene).not.toHaveBeenCalled();
  });
});
