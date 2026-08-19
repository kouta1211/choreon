import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DancerList } from "./DancerList";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { makeDancer, makePosition } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/** 名前と、足した順（createdAt）をわざと逆にしておく */
const PEOPLE = [
  { id: "d-3", name: "あいり", createdAt: "2026-08-03" },
  { id: "d-1", name: "ゆい", createdAt: "2026-08-01" },
  { id: "d-2", name: "みなみ", createdAt: "2026-08-02" },
];

function hydrate() {
  useProjectStore.setState({
    dancers: Object.fromEntries(
      PEOPLE.map((p) => [p.id, makeDancer({ ...p })]),
    ),
    positionsBySceneId: {
      "scene-1": Object.fromEntries(
        PEOPLE.map((p) => [p.id, makePosition({ dancerId: p.id })]),
      ),
    },
  });
  useUIStore.setState({ selectedSceneId: "scene-1", selectedDancerIds: [] });
}

function show() {
  render(
    <LocaleProvider locale="ja">
      <DancerList />
    </LocaleProvider>,
  );
}

/** 一覧に出ている名前を、並んでいる順に読む */
function listedNames() {
  return screen
    .getAllByRole("listitem")
    .map((item) => item.textContent?.match(/[ぁ-ん]+/)?.[0] ?? "");
}

afterEach(() => {
  useSettingsStore.setState({ dancerSort: "added" });
  vi.restoreAllMocks();
});

describe("DancerList の並べ替え", () => {
  it("既定は追加順（これまでと同じ見え方）", () => {
    hydrate();
    show();
    expect(listedNames()).toEqual(["ゆい", "みなみ", "あいり"]);
  });

  it("名前順に切り替えると、読みの順に並ぶ", async () => {
    hydrate();
    show();

    await userEvent.click(screen.getByRole("button", { name: "名前順" }));

    expect(listedNames()).toEqual(["あいり", "みなみ", "ゆい"]);
    // 端末へ覚える（開き直しても選び直さなくてよい）
    expect(useSettingsStore.getState().dancerSort).toBe("name");
  });

  /* 一覧の高さはステージの取り分と競っている。並べ替える意味が
     無いうちは場所を取らない */
  it("2人以下なら、並べ替えの入口を出さない", () => {
    hydrate();
    useProjectStore.setState({
      positionsBySceneId: {
        "scene-1": { "d-1": makePosition({ dancerId: "d-1" }) },
      },
    });
    show();
    expect(screen.queryByRole("button", { name: "名前順" })).toBeNull();
  });
});
