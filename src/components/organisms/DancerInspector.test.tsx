import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DancerInspector } from "./DancerInspector";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as dancersApi from "@/features/dancer/api/dancers";

import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";

/** 削除は確認ダイアログ越しになったため、インスペクター単体ではなく
 * ダイアログと一緒に描画する(本番ではレイアウトが1つだけ描いている) */
function renderInspector() {
  return render(
    <>
      <DancerInspector />
      <ConfirmDialog />
    </>,
  );
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DancerInspector", () => {
  it("ダンサーが選択されていなければ何も表示しない", () => {
    render(<DancerInspector />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("選択中のダンサー名を表示する", () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });

    render(<DancerInspector />);

    expect(screen.getByText("あいり")).toBeInTheDocument();
  });

  it("名前を押すと入力欄になり、Enterで確定するとSupabaseにも保存される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const updateNameSpy = vi
      .spyOn(dancersApi, "updateDancerName")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.type(screen.getByLabelText("ダンサー名"), "みゆ{Enter}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("みゆ");
    await waitFor(() => {
      expect(updateNameSpy).toHaveBeenCalledWith(
        expect.anything(),
        "dancer-1",
        "みゆ",
      );
    });
  });

  it("名前の変更をEscapeで取り消すと元の名前のまま保存もしない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const updateNameSpy = vi.spyOn(dancersApi, "updateDancerName");

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.type(screen.getByLabelText("ダンサー名"), "だめ{Escape}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("あいり");
    expect(updateNameSpy).not.toHaveBeenCalled();
  });

  it("名前を空欄にして確定した場合は変更しない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const updateNameSpy = vi.spyOn(dancersApi, "updateDancerName");

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.keyboard("{Enter}");

    expect(useProjectStore.getState().dancers["dancer-1"].name).toBe("あいり");
    expect(updateNameSpy).not.toHaveBeenCalled();
  });

  it("名前の保存に失敗したら元の名前へ戻す", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    vi.spyOn(dancersApi, "updateDancerName").mockRejectedValue(
      new Error("network"),
    );

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("ダンサー名を変更"));
    await user.clear(screen.getByLabelText("ダンサー名"));
    await user.type(screen.getByLabelText("ダンサー名"), "みゆ{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().dancers["dancer-1"].name).toBe(
        "あいり",
      );
    });
    expect(useUIStore.getState().toast?.type).toBe("error");
  });

  it("色スウォッチを押すと色が変わりSupabaseにも保存される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const updateColorSpy = vi
      .spyOn(dancersApi, "updateDancerColor")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("色を#ef4444に変更"));

    expect(useProjectStore.getState().dancers["dancer-1"].color).toBe(
      "#ef4444",
    );
    await waitFor(() => {
      expect(updateColorSpy).toHaveBeenCalledWith(
        expect.anything(),
        "dancer-1",
        "#ef4444",
      );
    });
  });

  it("削除ボタンを押して確認するとSupabase削除後にローカルからも消える", async () => {
    useProjectStore.setState({
      dancers: { "dancer-1": makeDancer() },
      positionsBySceneId: {
        "scene-1": {
          "dancer-1": {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 1,
            yCoordinate: 1,
            rotationAngle: 0,
          },
        },
      },
    });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    vi.spyOn(dancersApi, "deleteDancers").mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    // 何シーンぶんの配置が消えるかを添えている
    expect(screen.getByText("1 シーンぶんの配置")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().dancers["dancer-1"]).toBeUndefined();
    });
    expect(useUIStore.getState().selectedDancerIds).toEqual([]);
  });

  it("フォーカスボタンでfocusedDancerIdをトグルする", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const user = userEvent.setup();
    render(<DancerInspector />);

    await user.click(screen.getByLabelText("マイ・フォーカス"));
    expect(useUIStore.getState().focusedDancerId).toBe("dancer-1");

    await user.click(screen.getByLabelText("マイ・フォーカス"));
    expect(useUIStore.getState().focusedDancerId).toBeNull();
  });

  it("フォーカス中のダンサーを削除するとフォーカスも解除される", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({
      selectedDancerIds: ["dancer-1"],
      focusedDancerId: "dancer-1",
    });
    vi.spyOn(dancersApi, "deleteDancers").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useUIStore.getState().focusedDancerId).toBeNull();
    });
  });

  it("確認をキャンセルすると削除されない", async () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const deleteSpy = vi.spyOn(dancersApi, "deleteDancers");

    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByLabelText("ダンサーを削除"));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(useProjectStore.getState().dancers["dancer-1"]).toBeDefined();
    expect(useUIStore.getState().confirm).toBeNull();
  });
});

/* 実機の要望 2026-08-19「ステージと被っているのでストレスにつながる」。
   横に場所がある画面では右のパネルへ据える。**浮かせるかどうか**が
   唯一の違いなので、そこだけを見る */
describe("DancerInspector の置き場所", () => {
  function panelOf(element: HTMLElement) {
    return element.querySelector("div")!;
  }

  it("既定は浮かせる（狭い画面。ステージの上に重なる）", () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });

    const { container } = render(<DancerInspector />);
    const root = panelOf(container);
    expect(root.className).toContain("absolute");
    expect(root.className).toContain("overlay-panel");
  });

  it("パネルに置くときは浮かせない（ステージに一切かからない）", () => {
    useProjectStore.setState({ dancers: { "dancer-1": makeDancer() } });
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });

    const { container } = render(<DancerInspector variant="panel" />);
    const root = panelOf(container);
    expect(root.className).not.toContain("absolute");
    expect(root.className).not.toContain("overlay-panel");
  });

  it("どちらの置き方でも、誰も選んでいなければ何も描かない", () => {
    useUIStore.setState({ selectedDancerIds: [] });
    const { container } = render(<DancerInspector variant="panel" />);
    expect(container.firstChild).toBeNull();
  });
});

/* 実機の報告 17-3。移動がどれも同じ秒数の作品で、1人ぶんの秒数だけ
   置いても比べる相手が無い */
describe("DancerInspector の操作ボタン", () => {
  function showInspector() {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: false }),
      dancers: { "dancer-1": makeDancer({ name: "あいり" }) },
      scenes: [makeScene()],
      positionsBySceneId: { "scene-1": { "dancer-1": makePosition() } },
    });
    useUIStore.setState({
      selectedDancerIds: ["dancer-1"],
      selectedSceneId: "scene-1",
    });
    return render(
      <LocaleProvider locale="ja">
        <DancerInspector variant="panel" />
      </LocaleProvider>,
    );
  }

  it("ボタンは名前より後（＝右）に並ぶ", () => {
    showInspector();
    const focus = screen.getByLabelText("マイ・フォーカス");
    const name = screen.getByText("あいり");

    expect(
      name.compareDocumentPosition(focus) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /* 名前の長さでボタンが動かないのは、隣に置かず ml-auto で右端へ
     押し出しているから。ここが外れると 17-5 の問題が戻る */
  it("ボタンの組は ml-auto で右端へ寄せる", () => {
    showInspector();
    const focus = screen.getByLabelText("マイ・フォーカス");
    const group = focus.closest("div.ml-auto");

    expect(group).not.toBeNull();
  });

  /* 右端にあるので、中央や左に出すとパネルの縁からはみ出す */
  it("説明の吹き出しは右揃えで出す", () => {
    const { container } = showInspector();
    const tip = [...container.querySelectorAll("span[aria-hidden]")].find(
      (span) => span.textContent === "マイ・フォーカス",
    );

    expect(tip?.className).toContain("right-0");
  });

  /* 上に出すと、この行はパネルのいちばん上なので枠の外になって切れる */
  it("説明の吹き出しは下へ出す", () => {
    const { container } = showInspector();
    const tips = [...container.querySelectorAll("span[aria-hidden]")].filter(
      (span) => span.textContent === "マイ・フォーカス",
    );

    expect(tips).toHaveLength(1);
    expect(tips[0].className).toContain("top-full");
    expect(tips[0].className).not.toContain("bottom-full");
  });
});

/**
 * 名前の行に、由来の分からない数字を置かない。
 *
 * 実機の報告（2026-08-22）:「ダンサーの名前を変更する際に、変な秒数の
 * 項目が表示されてる」。この欄は【時計の絵と数字だけ】で、見出しは
 * 読み上げ用にしか付いていなかった。それが名前のすぐ横に並んでいた。
 */
