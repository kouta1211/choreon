import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CanvasBoard } from "./CanvasBoard";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

/**
 * 右クリックのメニューは CanvasBoard に結線した状態でしか意味を持たない
 * (押された場所から「誰の上か」を決める作り)ので、板ごと描いて試す。
 *
 * ゲストとして描くと persist が何もせずに返るので、Supabase を触らずに
 * 「楽観的更新 → 保存 → 履歴へ」の道をそのまま通せる。
 */
function renderBoard() {
  return render(
    <CanvasBoard
      isGuest
      project={makeProject({ stageWidth: 8, stageHeight: 8 })}
      initialDancers={[
        makeDancer({ id: "dancer-1", name: "あいり" }),
        makeDancer({ id: "dancer-2", name: "ゆい" }),
        makeDancer({ id: "dancer-3", name: "みなみ" }),
      ]}
      initialScenes={[makeScene()]}
      initialPositions={[
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
        {
          sceneId: "scene-1",
          dancerId: "dancer-3",
          xCoordinate: 3,
          yCoordinate: 5,
          rotationAngle: 0,
        },
      ]}
    />,
  );
}

/** 右クリック。押した場所は pointerdown で採るので、両方まとめて起こす */
function rightClick(element: Element) {
  fireEvent.pointerDown(element, { button: 2, pointerType: "mouse" });
  fireEvent.contextMenu(element);
}

function dancerElement(dancerId: string): Element {
  const element = document.querySelector(`[data-dancer-id="${dancerId}"]`);
  if (!element) throw new Error(`${dancerId} が描かれていない`);
  return element;
}

function positionOf(dancerId: string) {
  return useProjectStore.getState().positionsBySceneId["scene-1"]?.[dancerId];
}

function rotationOf(dancerId: string): number | undefined {
  return useProjectStore.getState().positionsBySceneId["scene-1"]?.[dancerId]
    ?.rotationAngle;
}

describe("StageContextMenu", () => {
  beforeEach(() => {
    // 客席の向きは端末の設定。vitest.setup の初期化対象に入っていない
    useSettingsStore.setState({ isAudienceOnTop: false });
  });

  it("選んでいない人を右クリックすると、その人だけを選び直してメニューを出す", async () => {
    renderBoard();
    useUIStore.getState().selectDancer("dancer-2");

    rightClick(dancerElement("dancer-1"));

    await screen.findByRole("menu");
    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-1"]);
  });

  it("選んである人を右クリックしたときは、まとめて選んだ分をそのまま残す", async () => {
    renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    rightClick(dancerElement("dancer-1"));

    await screen.findByRole("menu");
    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
    ]);
  });

  it("升を押すと、選んだ全員の向きが変わり、元に戻すで戻せる", async () => {
    const user = userEvent.setup();
    renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    rightClick(dancerElement("dancer-1"));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "奥を向く" }),
    );

    await waitFor(() => expect(rotationOf("dancer-1")).toBe(180));
    expect(rotationOf("dancer-2")).toBe(180);
    // 1手として積まれている(まとめて戻せる)
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  /* 升の位置は【画面の向き】、保存するのは【ステージの向き】。
     ここを取り違えると、左右は合っているのに前後だけ反対になる
     （画面を見ながら押している限り気づけない壊れ方）。
     札だけを見ても写し忘れは見つからない（札も同じ関数から引くため）ので、
     **升がどこに描かれているか**まで見る */
  it("既定では「奥を向く」は画面のいちばん上の升にあり、180度を保存する", async () => {
    const user = userEvent.setup();
    renderBoard();
    useUIStore.getState().selectDancer("dancer-1");

    rightClick(dancerElement("dancer-1"));
    const back = await screen.findByRole("menuitemradio", { name: "奥を向く" });
    expect(back.style.gridRow).toBe("1");

    await user.click(back);
    await waitFor(() => expect(rotationOf("dancer-1")).toBe(180));
  });

  it("客席を上にすると「奥を向く」は画面のいちばん下へ移り、保存する向きは変わらない", async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({ isAudienceOnTop: true });
    renderBoard();
    useUIStore.getState().selectDancer("dancer-1");

    rightClick(dancerElement("dancer-1"));
    const back = await screen.findByRole("menuitemradio", { name: "奥を向く" });
    expect(back.style.gridRow).toBe("3");

    await user.click(back);
    await waitFor(() => expect(rotationOf("dancer-1")).toBe(180));
  });

  it("削除は確認を挟む。押しただけでは消えない", async () => {
    const user = userEvent.setup();
    renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    rightClick(dancerElement("dancer-1"));
    await user.click(
      await screen.findByRole("menuitem", { name: /2人を削除/ }),
    );

    expect(useUIStore.getState().confirm?.title).toContain("2人");
    expect(Object.keys(useProjectStore.getState().dancers)).toHaveLength(3);
  });

  it("何も無いところを右クリックすると、地のメニューが出る", async () => {
    const user = userEvent.setup();
    renderBoard();

    rightClick(screen.getByTestId("stage"));

    await user.click(
      await screen.findByRole("menuitem", { name: "全員を選ぶ" }),
    );
    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-1",
      "dancer-2",
      "dancer-3",
    ]);
  });

  it("横一列に揃えると、選んだ全員の前後が重心へ寄る", async () => {
    const user = userEvent.setup();
    renderBoard();
    // y は 2 / 2 / 5 なので、重心は 3
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2", "dancer-3"]);

    rightClick(dancerElement("dancer-1"));
    await user.click(
      await screen.findByRole("menuitem", { name: "横一列に揃える" }),
    );

    await waitFor(() => expect(positionOf("dancer-3")?.yCoordinate).toBe(3));
    expect(positionOf("dancer-1")?.yCoordinate).toBe(3);
    expect(positionOf("dancer-2")?.yCoordinate).toBe(3);
    // 左右は触らない
    expect(positionOf("dancer-1")?.xCoordinate).toBe(2);
    // まとめて1手（元に戻す1回で戻る）
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it("左右に等間隔で配ると、両端は動かず間だけが動く", async () => {
    const user = userEvent.setup();
    renderBoard();
    // x は 2 / 6 / 3。両端の 2 と 6 は動かず、間の 1人が 4 へ
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2", "dancer-3"]);

    rightClick(dancerElement("dancer-1"));
    await user.click(
      await screen.findByRole("menuitem", { name: "左右に等間隔" }),
    );

    await waitFor(() => expect(positionOf("dancer-3")?.xCoordinate).toBe(4));
    expect(positionOf("dancer-1")?.xCoordinate).toBe(2);
    expect(positionOf("dancer-2")?.xCoordinate).toBe(6);
  });

  it("1人しか選んでいなければ、整列そのものを出さない", async () => {
    renderBoard();
    useUIStore.getState().selectDancer("dancer-1");

    rightClick(dancerElement("dancer-1"));
    await screen.findByRole("menu");

    expect(screen.queryByText("整列")).not.toBeInTheDocument();
  });

  it("2人のときは等間隔を出さない（配る余地が無い）", async () => {
    renderBoard();
    useUIStore.getState().selectDancers(["dancer-1", "dancer-2"]);

    rightClick(dancerElement("dancer-1"));
    await screen.findByRole("menu");

    expect(
      screen.getByRole("menuitem", { name: "横一列に揃える" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "左右に等間隔" }),
    ).not.toBeInTheDocument();
  });

  it("ステージの外(下のボタン列)では開かない", async () => {
    renderBoard();

    rightClick(screen.getByRole("button", { name: "元に戻す" }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
