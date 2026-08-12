import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewerLayout } from "./ViewerLayout";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";

const PROJECT = makeProject({ id: "p1", stageWidth: 12, stageHeight: 9 });
const DANCERS = [
  makeDancer({ id: "d1", name: "うみ", color: "#3b82f6" }),
  makeDancer({ id: "d2", name: "そら", color: "#ef4444" }),
];
const SCENES = [
  makeScene({ id: "s1", name: "頭", timeSeconds: 0, orderIndex: 0 }),
  makeScene({ id: "s2", name: "サビ", timeSeconds: 4, orderIndex: 1 }),
];
const POSITIONS = [
  makePosition({ sceneId: "s1", dancerId: "d1", xCoordinate: 2, yCoordinate: 4 }),
  makePosition({ sceneId: "s1", dancerId: "d2", xCoordinate: 8, yCoordinate: 4 }),
  makePosition({ sceneId: "s2", dancerId: "d1", xCoordinate: 8, yCoordinate: 7 }),
  makePosition({ sceneId: "s2", dancerId: "d2", xCoordinate: 2, yCoordinate: 4 }),
];

function renderViewer(requestedDancerId: string | null = null) {
  return render(
    <ViewerLayout
      project={PROJECT}
      dancers={DANCERS}
      scenes={SCENES}
      positions={POSITIONS}
      requestedDancerId={requestedDancerId}
    />,
  );
}

afterEach(() => {
  localStorage.clear();
  useViewerStore.setState({
    project: null,
    dancers: [],
    scenes: [],
    positionsBySceneId: {},
    focusedDancerId: null,
    hasChosen: false,
    currentSeconds: 0,
    isPathVisible: true,
  });
});

describe("ViewerLayout", () => {
  // 選ぶまでこの画面の意味は半分しかない。あとから探させない
  it("開いた最初にポジションを訊く", () => {
    renderViewer();
    expect(screen.getByText("あなたはどれですか")).toBeInTheDocument();
  });

  it("名前チップから選ぶと本体に入る", () => {
    renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "うみ" }));

    expect(screen.queryByText("あなたはどれですか")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通しで再生" })).toBeInTheDocument();
  });

  // 振付師が一人ひとりに違うリンクを配れるようにする
  it("?p= で指定されていれば、訊かずに本体から始める", () => {
    renderViewer("d2");
    expect(screen.queryByText("あなたはどれですか")).not.toBeInTheDocument();
  });

  // 黙って別人になるより、選び直してもらう方が安全
  it("居ないダンサーが指定されていたら入口に戻す", () => {
    renderViewer("居ない人");
    expect(screen.getByText("あなたはどれですか")).toBeInTheDocument();
  });

  it("選ばずに全員を見ることもできる", () => {
    renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "選ばずに全員を見る" }));

    expect(screen.queryByText("あなたはどれですか")).not.toBeInTheDocument();
    expect(useViewerStore.getState().focusedDancerId).toBeNull();
  });

  describe("編集の操作を持たない", () => {
    it.each([
      "シーンを追加",
      "ダンサーを追加",
      "元に戻す",
      "保存",
      "フォーメーションから選ぶ",
    ])("%s は出さない", (label) => {
      renderViewer("d1");
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  describe("道順", () => {
    it("次の移動を言葉で出す", () => {
      renderViewer("d1");
      // (2,4) → (8,7): 画面右へ = 上手、客席側 = 前
      expect(screen.getByText(/上手前へ/)).toBeInTheDocument();
    });

    it("全員を見るときは道順を出さない", () => {
      renderViewer();
      fireEvent.click(screen.getByRole("button", { name: "選ばずに全員を見る" }));
      expect(screen.queryByRole("button", { name: "ぜんぶ" })).not.toBeInTheDocument();
    });

    it("「ぜんぶ」で道順の一覧が開く", () => {
      renderViewer("d1");
      fireEvent.click(screen.getByRole("button", { name: "ぜんぶ" }));

      expect(screen.getByRole("dialog", { name: "うみ の道順" })).toBeInTheDocument();
      expect(
        screen.getByText(/上手／下手は客席から見た向きです。/),
      ).toBeInTheDocument();
    });
  });

  it("導線は切れる。隊形だけ見たいことがある", () => {
    renderViewer("d1");
    const toggle = screen.getByRole("switch", { name: /導線/ });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);
    expect(useViewerStore.getState().isPathVisible).toBe(false);
  });
});
