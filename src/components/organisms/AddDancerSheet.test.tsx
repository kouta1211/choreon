import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDancerSheet } from "./AddDancerSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import * as positionsApi from "@/features/scene/api/positions";
import type { Dancer } from "@/features/dancer/types";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

import {
  makeDancer as makeBaseDancer,
  makeProject,
  makeScene,
} from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// 自動採番の名前("1", "2"...)を検証するテストなので、既定の名前も数字にする
function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return makeBaseDancer({ name: "1", ...overrides });
}

function openSheet() {
  /* 立ち位置を作るには、その置き先（シーン）が要る。
     選んでいる id だけでは足りない */
  useProjectStore.setState({ scenes: [makeScene()] });
  useUIStore.setState({
    isAddDancerSheetOpen: true,
    selectedSceneId: "scene-1",
  });
}

function mockApis() {
  vi.spyOn(dancersApi, "createDancers").mockResolvedValue([]);
  return vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AddDancerSheet", () => {
  it("閉じているときは何も表示しない", () => {
    render(<AddDancerSheet project={makeProject()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /* **今回変えた**（実機の報告 2026-08-22）。以前は名前の欄を出さず、
     追加してから右のパネルで直す形だった */
  it("人数と、その場で直せる名前の欄が出る", () => {
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    expect(screen.getByLabelText("追加する人数")).toBeInTheDocument();
    expect(screen.getByLabelText("1人目の名前")).toBeInTheDocument();
  });

  it("名前は通し番号で自動採番され、追加前に見える", () => {
    useProjectStore.setState({
      dancers: { "dancer-1": makeDancer({ name: "3" }) },
    });
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    /* 既存の最大が3なので次は4。**欄は空のまま**で、自動で決めた名前は
       薄い字（placeholder）で出す。打った人だけが入れ替わる */
    const field = screen.getByLabelText("1人目の名前");
    expect(field).toHaveValue("");
    expect(field).toHaveAttribute("placeholder", "4");
  });

  it("人数を増やすと、その数だけ名前と色の下見が並ぶ", async () => {
    openSheet();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByLabelText("1人増やす"));

    expect(screen.getByLabelText("追加する人数")).toHaveValue(3);
    for (const nth of [1, 2, 3]) {
      expect(screen.getByLabelText(`${nth}人目の名前`)).toHaveAttribute(
        "placeholder",
        String(nth),
      );
    }
  });

  it("追加したダンサーは同じ場所に重ならない", async () => {
    openSheet();
    const upsertSpy = mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByRole("button", { name: "3人を追加する" }));

    const positions = Object.values(
      useProjectStore.getState().positionsBySceneId["scene-1"] ?? {},
    );
    expect(positions).toHaveLength(3);
    const spots = positions.map((p) => `${p.xCoordinate},${p.yCoordinate}`);
    expect(new Set(spots).size).toBe(3);

    await waitFor(() => expect(upsertSpy).toHaveBeenCalled());
  });

  it("既にいる人の行を避けて置く(組みかけの隊形に割り込まない)", async () => {
    useProjectStore.setState({
      positionsBySceneId: {
        "scene-1": {
          "dancer-1": {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            // 15x10 ステージの中央
            xCoordinate: 8,
            yCoordinate: 5,
            rotationAngle: 0,
          },
        },
      },
    });
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByRole("button", { name: "1人を追加する" }));

    const added = Object.values(
      useProjectStore.getState().positionsBySceneId["scene-1"] ?? {},
    ).filter((p) => p.dancerId !== "dancer-1");
    // 既存の人がいる行(y=5)には入らず、空いている奥の行へ
    expect(added[0].yCoordinate).not.toBe(5);
    expect(added[0].yCoordinate).toBe(1);
  });

  it("複数追加するとき、色がなるべくかぶらない", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByRole("button", { name: "3人を追加する" }));

    const colors = Object.values(useProjectStore.getState().dancers).map(
      (dancer) => dancer.color,
    );
    expect(new Set(colors).size).toBe(3);
  });

  it("追加に成功したらトーストで知らせ、シートを閉じる", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByRole("button", { name: "1人を追加する" }));

    expect(useUIStore.getState().isAddDancerSheetOpen).toBe(false);
    await waitFor(() => {
      expect(useUIStore.getState().toast?.message).toBe(
        "1 をステージに追加しました",
      );
    });
  });

  it("保存に失敗したらローカルの追加を取り消してトースト表示する", async () => {
    openSheet();
    vi.spyOn(dancersApi, "createDancers").mockRejectedValue(
      new Error("network"),
    );
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByRole("button", { name: "2人を追加する" }));

    await waitFor(() => {
      expect(Object.keys(useProjectStore.getState().dancers)).toHaveLength(0);
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
  });

  /* ここから、その場で直せるようになったぶん（実機の報告 2026-08-22） */

  it("名前を打つと、その名前で作られる", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.type(screen.getByLabelText("1人目の名前"), "さくら");
    await user.click(screen.getByRole("button", { name: "1人を追加する" }));

    const added = Object.values(useProjectStore.getState().dancers);
    expect(added.map((dancer) => dancer.name)).toEqual(["さくら"]);
  });

  /* 打たなかった人は、薄い字で出ていた名前のまま作る */
  it("打った人だけが入れ替わり、触らなかった人は自動のまま", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.type(screen.getByLabelText("2人目の名前"), "みなみ");
    await user.click(screen.getByRole("button", { name: "2人を追加する" }));

    const names = Object.values(useProjectStore.getState().dancers).map(
      (dancer) => dancer.name,
    );
    expect(names).toEqual(["1", "みなみ"]);
  });

  /* 空白だけ打ったら「決めなかった」と同じ。名前の無い人を作らない */
  it("空白だけ打っても、自動で決めた名前で作る", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.type(screen.getByLabelText("1人目の名前"), "   ");
    await user.click(screen.getByRole("button", { name: "1人を追加する" }));

    expect(
      Object.values(useProjectStore.getState().dancers)[0].name,
    ).toBe("1");
  });

  it("色の丸を押すと、その人ぶんの色の列が開く", async () => {
    openSheet();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    // 開く前は、どの人の色の列も出ていない
    expect(screen.queryByLabelText("自由に色を選ぶ")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("1 の色を選ぶ"));

    // 開くのは押した人のぶんだけ（20人ぶん常に出すと丸が140個並ぶ）
    expect(screen.getAllByLabelText("自由に色を選ぶ")).toHaveLength(1);
  });

  it("選んだ色で作られる", async () => {
    openSheet();
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1 の色を選ぶ"));
    // 既定の6色のうち、自動で決まったのとは別の1つを押す
    const target = DANCER_COLOR_PALETTE[3];
    await user.click(screen.getByLabelText(`色を${target}に変更`));
    await user.click(screen.getByRole("button", { name: "1人を追加する" }));

    expect(Object.values(useProjectStore.getState().dancers)[0].color).toBe(
      target,
    );
  });

  /**
   * **シーンが1つも無くても足せる**（user の指示 2026-08-22）。
   * ダンサーは作品に属するもので、シーンに属していない。
   * 立ち位置は最初のシーンを作ったときに配られる（useAddScene）。
   */
  it("シーンが1つも無くても足せる（立ち位置はまだ作らない）", async () => {
    useProjectStore.setState({ scenes: [], positionsBySceneId: {} });
    useUIStore.setState({ isAddDancerSheetOpen: true, selectedSceneId: null });
    mockApis();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    const submit = screen.getByRole("button", { name: "1人を追加する" });
    expect(submit).toBeEnabled();
    await user.click(submit);

    // 人は増える
    await waitFor(() =>
      expect(Object.keys(useProjectStore.getState().dancers)).toHaveLength(1),
    );
    // 置き先が無いので、立ち位置はまだ作らない
    expect(useProjectStore.getState().positionsBySceneId).toEqual({});
  });
});
