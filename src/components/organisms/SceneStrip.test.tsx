import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneStrip } from "./SceneStrip";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { makeProject, makeScene } from "@/test/factories";
import * as scenesApi from "@/features/scene/api/scenes";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/** 時刻はわざと詰めてある。時間軸だとコマが重なる並び */
const SCENES = [
  makeScene({ id: "scene-1", name: "はじめ", orderIndex: 0, timeSeconds: 0 }),
  makeScene({ id: "scene-2", name: "サビ", orderIndex: 1, timeSeconds: 4 }),
  makeScene({ id: "scene-3", name: "おわり", orderIndex: 2, timeSeconds: 4.2 }),
];

function show() {
  render(
    <LocaleProvider locale="ja">
      <SceneStrip project={makeProject()} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ scenes: SCENES, thumbnailBySceneId: {} });
  useUIStore.setState({ selectedSceneId: "scene-1" });
});

afterEach(() => vi.restoreAllMocks());

describe("SceneStrip", () => {
  /* ここが要望の芯。時刻がどれだけ詰まっていても、**並びは等間隔**なので
     コマが重ならない＝どれも押せる */
  it("シーンを順番どおりに、時刻に関わらず全部出す", () => {
    show();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("はじめ"),
      expect.stringContaining("サビ"),
      expect.stringContaining("おわり"),
    ]);
  });

  /* この形では移動がどれも同じ秒数なので、コマごとに言う数字が無い */
  it("秒数を出さない", () => {
    show();
    expect(screen.queryByText(/s$/)).toBeNull();
    expect(screen.queryByText(/\d+\s*秒/)).toBeNull();
  });

  /* 数字が消えて並んだだけになると、順に流れていくものだと読めなくなる
     （実機の報告 17-3）。運ぶのは「向き」であって「量」ではない */
  it("コマとコマの間に矢印を出す（先頭の前には出さない）", () => {
    show();
    // シーンは3つ。間は2つ
    expect(screen.getAllByText("→")).toHaveLength(2);
  });

  /* 番号は下のバーの見出しと一覧が持っている。幅74pxのコマに重ねると
     名前を狭めるだけだった（実機の報告 17-4） */
  it("コマに通し番号を出さない", () => {
    show();
    expect(screen.queryByText(/^0\d$/)).toBeNull();
  });

  it("押すと、そのシーンに切り替わる", async () => {
    show();
    await userEvent.click(screen.getByText("おわり"));
    expect(useUIStore.getState().selectedSceneId).toBe("scene-3");
  });

  it("シーンが無ければ何も描かない", () => {
    useProjectStore.setState({ scenes: [] });
    show();
    expect(screen.queryByTestId("scene-strip")).toBeNull();
  });
});

/**
 * 帯の上で掴んで並び替える（実機の要望 17-1）。
 *
 * jsdom は寸法を持たないので、**コマの矩形を自分で与える**（PathOverlay の
 * テストと同じ手）。与えないと dnd-kit が落とし先を決められず、
 * 掴んでも `over` が null のまま終わる。
 */
describe("SceneStrip の並び替え", () => {
  /** 74px 幅のコマが横に並んでいることにする */
  function layOutCards() {
    screen.getAllByRole("listitem").forEach((item, index) => {
      item.getBoundingClientRect = () =>
        ({
          x: index * 80,
          y: 0,
          left: index * 80,
          top: 0,
          right: index * 80 + 74,
          bottom: 74,
          width: 74,
          height: 74,
          toJSON: () => ({}),
        }) as DOMRect;
      item.setPointerCapture = () => {};
      item.releasePointerCapture = () => {};
    });
  }

  it("コマを掴んで動かすと、その順番で確定する", async () => {
    const update = vi
      .spyOn(scenesApi, "updateSceneTimes")
      .mockResolvedValue(undefined);
    show();
    layOutCards();

    /* マウスは onMouseDown で始まる（SceneRowMouseSensor）。
       8px 動かないと掴んだことにならないので、まず小さく動かす */
    const first = screen.getAllByRole("listitem")[0];
    fireEvent.mouseDown(first, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 20, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 170, clientY: 0 });
    fireEvent.mouseUp(document, { clientX: 170, clientY: 0 });

    await waitFor(() => expect(update).toHaveBeenCalled());
    // 中身は reorderSceneIds / uniformTimes のテストが持っている。
    // ここで見るのは【掴んで確定まで届いたか】
    expect(useProjectStore.getState().scenes[0].id).not.toBe("scene-1");
  });
});
