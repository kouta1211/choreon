import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./ProjectList";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as projectsApi from "@/features/project/api/projects";
import type { ProjectSummary } from "@/features/project/types";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function makeProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "1",
    userId: "user-1",
    title: "サンプルプロジェクト",
    stageWidth: 8,
    stageHeight: 8,
    musicTitle: null,
    isMetronomeEnabled: false,
    musicOffsetSeconds: 0,
    bpm: 120,
    beatsPerBar: 4,
    shareToken: null,
    isShared: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sceneCount: 3,
    dancerCount: 2,
    totalSeconds: 2.5,
    dancerColors: ["#3b82f6", "#ef4444"],
    firstScenePositions: [
      { xCoordinate: 2, yCoordinate: 2, color: "#3b82f6" },
      { xCoordinate: 6, yCoordinate: 4, color: "#ef4444" },
    ],
    ...overrides,
  };
}

/** 削除は確認ダイアログ越しになったため、一覧単体ではなくダイアログと
 * 一緒に描画する(本番ではレイアウトが1つだけ描いている) */
function renderList(projects: ProjectSummary[]) {
  return render(
    <>
      <ProjectList projects={projects} />
      <ConfirmDialog />
    </>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("ProjectList", () => {
  it("プロジェクトが無い場合は案内文を表示する", () => {
    render(<ProjectList projects={[]} />);
    expect(
      screen.getByText("まだプロジェクトがありません。"),
    ).toBeInTheDocument();
  });

  it("プロジェクトのタイトルを一覧表示する", () => {
    render(
      <ProjectList
        projects={[
          makeProject({ id: "1", title: "発表会A" }),
          makeProject({ id: "2", title: "発表会B" }),
        ]}
      />,
    );
    expect(screen.getByText("発表会A")).toBeInTheDocument();
    expect(screen.getByText("発表会B")).toBeInTheDocument();
  });

  it("削除ボタンを押して確認するとSupabaseから削除し一覧を取り直す", async () => {
    const deleteSpy = vi
      .spyOn(projectsApi, "deleteProject")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    expect(screen.getByText("「発表会A」を削除しますか?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), "1");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("確認をキャンセルすると削除されない", async () => {
    const deleteSpy = vi.spyOn(projectsApi, "deleteProject");
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(useUIStore.getState().confirm).toBeNull();
  });

  /**
   * ここに改名が無かったので、名前を直すには作品を開くしかなかった
   * (動作確認の台本は、一覧で直せる前提で書いてある)。
   */
  describe("一覧から名前を変える", () => {
    it("鉛筆から書き換えると、保存して一覧を取り直す", async () => {
      const renameSpy = vi
        .spyOn(projectsApi, "updateProjectTitle")
        .mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderList([makeProject({ id: "1", title: "発表会A" })]);

      await user.click(screen.getByLabelText("プロジェクト名を変更"));
      const field = screen.getByLabelText("プロジェクト名");
      await user.clear(field);
      await user.type(field, "発表会2026{Enter}");

      await waitFor(() => {
        expect(renameSpy).toHaveBeenCalledWith(
          expect.anything(),
          "1",
          "発表会2026",
        );
      });
      expect(refresh).toHaveBeenCalled();
      // 取り直しが返るまでは手元で覚えた名前を出す
      expect(screen.getByText("発表会2026")).toBeInTheDocument();
    });

    it("保存に失敗したら元の名前へ戻し、トーストで知らせる", async () => {
      vi.spyOn(projectsApi, "updateProjectTitle").mockRejectedValue(
        new Error("network"),
      );
      const user = userEvent.setup();
      renderList([makeProject({ id: "1", title: "発表会A" })]);

      await user.click(screen.getByLabelText("プロジェクト名を変更"));
      const field = screen.getByLabelText("プロジェクト名");
      await user.clear(field);
      await user.type(field, "発表会2026{Enter}");

      await waitFor(() => {
        expect(useUIStore.getState().toast?.message).toBe(
          "名前の変更に失敗しました",
        );
      });
      expect(screen.getByText("発表会A")).toBeInTheDocument();
    });
  });

  it("削除に失敗したらトーストで知らせる", async () => {
    vi.spyOn(projectsApi, "deleteProject").mockRejectedValue(
      new Error("network"),
    );
    const user = userEvent.setup();
    renderList([makeProject({ id: "1", title: "発表会A" })]);

    await user.click(screen.getByLabelText("発表会Aを削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useUIStore.getState().toast?.message).toBe(
        "プロジェクトの削除に失敗しました",
      );
    });
  });
});

/* カードは「どれか」を見分けるためのもの。数（シーン数・人数・尺）は
   落とし、代わりに曲の名前を出す（実機の報告 2026-08-20） */
describe("ProjectList のカードに出すもの", () => {
  it("曲を入れていれば、その名前を出す", () => {
    render(
      <ProjectList
        projects={[makeProject({ musicTitle: "midnight.mp3" })]}
      />,
    );

    expect(screen.getByText("midnight.mp3")).toBeInTheDocument();
  });

  it("曲を入れていなければ、その行ごと出さない", () => {
    render(<ProjectList projects={[makeProject({ musicTitle: null })]} />);

    expect(screen.queryByText(/mp3/)).toBeNull();
  });

  it("シーン数・人数・通しの尺は出さない", () => {
    render(
      <ProjectList
        projects={[
          makeProject({ sceneCount: 3, dancerCount: 5, totalSeconds: 12 }),
        ]}
      />,
    );

    expect(screen.queryByText(/シーン ·|3 シーン|5 人/)).toBeNull();
    expect(screen.queryByText("12s")).toBeNull();
  });
});
