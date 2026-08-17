import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareSheet } from "./ShareSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as projectsApi from "@/features/project/api/projects";
import { makeProject } from "@/test/factories";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 共有のオン/オフのスイッチは外した(2026-08-17)。
 *
 * 「共有」を開いた人は配りたくて開いているので、そこからもう一度
 * スイッチを入れさせるのは押す前から答えの分かっている問いだった。
 *
 * **ここは実装側(私)がログイン後の画面を実機で触れない場所**なので、
 * 「開いた時点で共有が始まる」「やめられる」「鍵が無ければ勝手に
 * 始めない」をテストで押さえておく。取り違えると、開いただけで作品が
 * 配れる状態になる — 静かに間違えてよい場所ではない。
 *
 * ■ ストアがプロップより優先される
 * ShareSheet は `state.project?.id === project.id` なら**ストアの値**を
 * 正とする(プロジェクト名と同じ考え方)。だからここでも、見たい状態は
 * **ストアに入れる**。プロップだけ変えても効かない。
 */
function open(project: Project) {
  // 保存が実際に走る条件(ゲストでない・自動保存が入っている)にしておく
  useProjectStore.setState({ isGuest: false, project });
  return render(<ShareSheet project={project} isOpen onClose={() => {}} />);
}

afterEach(() => {
  vi.restoreAllMocks();
  useUIStore.setState({ confirm: null });
});

const SHARED = makeProject({ isShared: true, shareToken: "tok-123" });
const NOT_SHARED = makeProject({ isShared: false, shareToken: "tok-123" });
const NO_KEY = makeProject({ isShared: false, shareToken: null });

describe("ShareSheet", () => {
  it("オン/オフのスイッチは出さない", () => {
    open(SHARED);

    expect(
      screen.queryByRole("switch", {
        name: /リンクを知っている人が見られる/,
      }),
    ).not.toBeInTheDocument();
  });

  it("共有中なら、開いた時点でリンクが出ている", () => {
    open(SHARED);

    expect(screen.getByText(/いま共有中です/)).toBeInTheDocument();
    expect(screen.getByText(/tok-123/)).toBeInTheDocument();
  });

  /**
   * ここが要点。**開いた時点で共有が始まる。**
   * 配りたくて開いているので、もう一度オンにさせない。
   */
  it("まだ共有していない作品は、開いた時点で共有を始める", async () => {
    const spy = vi
      .spyOn(projectsApi, "updateProjectSharing")
      .mockResolvedValue(undefined);

    open(NOT_SHARED);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.anything(), "project-1", true);
    });
    expect(useProjectStore.getState().project?.isShared).toBe(true);
  });

  /**
   * 出せるリンクが無いのに「共有中」になると、読めない状態になる。
   * 鍵はスキーマが古いと入っていない。
   */
  it("共有用の鍵が無ければ、勝手に共有を始めない", async () => {
    const spy = vi.spyOn(projectsApi, "updateProjectSharing");

    open(NO_KEY);

    expect(screen.getByText(/まだ共有用の鍵がありません/)).toBeInTheDocument();
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
    expect(useProjectStore.getState().project?.isShared).toBe(false);
  });

  it("閉じている間は、何も始めない", async () => {
    const spy = vi.spyOn(projectsApi, "updateProjectSharing");
    useProjectStore.setState({ isGuest: false, project: NOT_SHARED });

    render(
      <ShareSheet project={NOT_SHARED} isOpen={false} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
    expect(useProjectStore.getState().project?.isShared).toBe(false);
  });

  /**
   * やめても鍵は作り直さないので、同じリンクが戻る。だから確認を挟まず、
   * **押したその場で止まる**。確認ダイアログ越しの削除と同じ重さに
   * なっていないことを見ておく。
   */
  it("「共有をやめる」は、確認を挟まずその場で止まる", async () => {
    const spy = vi
      .spyOn(projectsApi, "updateProjectSharing")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();

    open(SHARED);
    expect(useProjectStore.getState().project?.isShared).toBe(true);

    await user.click(screen.getByText("共有をやめる"));

    expect(useUIStore.getState().confirm).toBeNull();
    expect(useProjectStore.getState().project?.isShared).toBe(false);
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.anything(), "project-1", false);
    });
  });

  it("やめたあとは「もう一度このリンクで共有する」から戻せる", async () => {
    const spy = vi
      .spyOn(projectsApi, "updateProjectSharing")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();

    // 一度やめた状態から始める(自動で始まらないよう、開いてから止める)
    open(SHARED);
    await user.click(screen.getByText("共有をやめる"));
    expect(useProjectStore.getState().project?.isShared).toBe(false);

    await user.click(screen.getByText("もう一度このリンクで共有する"));

    expect(useProjectStore.getState().project?.isShared).toBe(true);
    // 鍵は作り直さないので、同じリンクが戻る
    expect(useProjectStore.getState().project?.shareToken).toBe("tok-123");
    await waitFor(() => {
      expect(spy).toHaveBeenLastCalledWith(
        expect.anything(),
        "project-1",
        true,
      );
    });
  });
});
