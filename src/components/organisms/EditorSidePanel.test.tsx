import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorSidePanel } from "./EditorSidePanel";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function show(showScenes: boolean) {
  return render(
    <LocaleProvider locale="ja">
      <EditorSidePanel project={makeProject()} showScenes={showScenes} />
    </LocaleProvider>,
  );
}

function select(dancerId: string | null) {
  useProjectStore.setState({
    dancers: { "dancer-1": makeDancer({ id: "dancer-1", name: "あいり" }) },
    scenes: [makeScene()],
  });
  useUIStore.setState({
    selectedDancerIds: dancerId ? [dancerId] : [],
    selectedSceneId: "scene-1",
  });
}

afterEach(() => useUIStore.setState({ selectedDancerIds: [] }));

describe("EditorSidePanel", () => {
  it("誰も選んでいなければ、詳細は出ない", () => {
    select(null);
    show(true);
    expect(screen.queryByDisplayValue("あいり")).toBeNull();
  });

  /* ここが実機の要望の芯。**シーンの一覧を見ている間に選んでも**出る
     ＝ タブの外に据えてあること */
  it("シーンのタブを見ている間にダンサーを選んでも、詳細が出る", () => {
    select("dancer-1");
    show(true);
    expect(screen.getByText("あいり")).toBeInTheDocument();
  });

  it("3ペイン（タブ無し）でも出る", () => {
    select("dancer-1");
    show(false);
    expect(screen.getByText("あいり")).toBeInTheDocument();
  });
});
