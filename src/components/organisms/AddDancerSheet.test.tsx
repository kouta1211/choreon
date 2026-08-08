import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddDancerSheet } from "./AddDancerSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";
import * as positionsApi from "@/features/scene/api/positions";
import type { Dancer } from "@/features/dancer/types";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(): Project {
  return {
    id: "project-1",
    userId: "user-1",
    title: "発表会A",
    stageWidth: 15,
    stageHeight: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeDancer(overrides: Partial<Dancer> = {}): Dancer {
  return {
    id: "dancer-1",
    projectId: "project-1",
    name: "1",
    color: "#3b82f6",
    initialDirection: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function openSheet() {
  useUIStore.setState({
    isAddDancerSheetOpen: true,
    selectedSceneId: "scene-1",
  });
}

function mockApis() {
  vi.spyOn(dancersApi, "createDancers").mockResolvedValue([]);
  return vi
    .spyOn(positionsApi, "upsertPositions")
    .mockResolvedValue(undefined);
}

afterEach(() => {
  vi.restoreAllMocks();
  useProjectStore.setState({
    project: null,
    dancers: {},
    scenes: [],
    positionsBySceneId: {},
  });
  useUIStore.setState({
    isAddDancerSheetOpen: false,
    selectedSceneId: null,
    toast: null,
  });
});

describe("AddDancerSheet", () => {
  it("閉じているときは何も表示しない", () => {
    render(<AddDancerSheet project={makeProject()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("聞くのは人数だけで、名前の入力欄は無い", () => {
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    expect(screen.getByLabelText("追加する人数")).toBeInTheDocument();
    expect(screen.queryByLabelText("名前")).not.toBeInTheDocument();
  });

  it("名前は通し番号で自動採番され、追加前に見える", () => {
    useProjectStore.setState({
      dancers: { "dancer-1": makeDancer({ name: "3" }) },
    });
    openSheet();
    render(<AddDancerSheet project={makeProject()} />);

    // 既存の最大が3なので次は4
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("人数を増やすと、その数だけ名前と色の下見が並ぶ", async () => {
    openSheet();
    const user = userEvent.setup();
    render(<AddDancerSheet project={makeProject()} />);

    await user.click(screen.getByLabelText("1人増やす"));
    await user.click(screen.getByLabelText("1人増やす"));

    expect(screen.getByLabelText("追加する人数")).toHaveValue(3);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
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

  it("シーンが1つも無ければ追加できない", () => {
    useUIStore.setState({ isAddDancerSheetOpen: true, selectedSceneId: null });
    render(<AddDancerSheet project={makeProject()} />);

    expect(
      screen.getByRole("button", { name: "1人を追加する" }),
    ).toBeDisabled();
  });
});
