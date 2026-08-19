import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneStrip } from "./SceneStrip";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { makeProject, makeScene } from "@/test/factories";

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

  /* 秒数は「このシーンの長さ」ではなく【区間】の値。コマの中ではなく
     コマとコマの間に出す */
  it("コマとコマの間に、そこへ来るまでの秒数を出す", () => {
    show();
    expect(screen.getByText("→ 4s")).toBeInTheDocument();
    expect(screen.getByText("→ 0.2s")).toBeInTheDocument();
  });

  it("先頭には、入ってくる秒数を出さない（入ってくる元が無い）", () => {
    show();
    // 区間は「シーンの数 - 1」個
    expect(screen.getAllByText(/^→ /)).toHaveLength(2);
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
