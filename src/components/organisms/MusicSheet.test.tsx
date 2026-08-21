import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicSheet } from "./MusicSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { makeProject } from "@/test/factories";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 曲の板。ここで押さえるのは**何を出すか**の1点。
 *
 * 曲を選ぶ前は、頭出しの欄が押せても意味が無い(何秒目から鳴らすかを
 * 決める相手がいない)ので出さない。
 *
 * **ただし値が入っていれば、曲が無くても出す。** 頭出しは端末の好みでは
 * なく作品の一部で、クラウドに残る。別の端末で開くと音源だけが無い状態に
 * なるので、そこで欄ごと隠すと「なぜ途中から鳴るのか」を確かめる手段が
 * 消える。**入口を塞ぐ変更は、奥にある物を黙って殺す**(2026-08-20 の教訓)。
 */
function open(project: Project, music: { fileName: string | null }) {
  // ゲストなら persist が何もせずに返る(保存の成否ではなく、画面の
  // 振る舞いだけを見たいのでこちらにする)
  useProjectStore.setState({ isGuest: true, project });
  useMusicStore.setState({
    fileName: music.fileName,
    objectUrl: null,
    durationSeconds: null,
  });
  return render(<MusicSheet project={project} isOpen onClose={() => {}} />);
}

const offsetField = () => screen.queryByRole("spinbutton", { name: /開始位置/ });

afterEach(() => {
  useMusicStore.setState({ fileName: null, objectUrl: null });
});

describe("MusicSheet", () => {
  it("曲を選ぶ前は、頭出しの欄を出さない", () => {
    open(makeProject({ musicOffsetSeconds: 0 }), { fileName: null });

    expect(offsetField()).not.toBeInTheDocument();
  });

  it("曲があれば頭出しの欄を出す", () => {
    open(makeProject({ musicOffsetSeconds: 0 }), { fileName: "song.mp3" });

    expect(offsetField()).toBeInTheDocument();
  });

  it("曲が無くても、頭出しの値が入っていれば出す（別の端末で開いたとき）", () => {
    open(makeProject({ musicOffsetSeconds: 12.5 }), { fileName: null });

    expect(offsetField()).toHaveValue(12.5);
  });

  it("曲があるときは、曲がないときの拍を出さない", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.queryByText("曲がないときの拍")).not.toBeInTheDocument();
  });

  it("打っただけでは変わらない。「適用」を押して初めて効く", async () => {
    const user = userEvent.setup();
    open(makeProject({ musicOffsetSeconds: 0 }), { fileName: "song.mp3" });

    await user.clear(offsetField()!);
    await user.type(offsetField()!, "12.5");
    await user.tab();

    expect(useProjectStore.getState().project?.musicOffsetSeconds).toBe(0);
    expect(screen.getByText(/適用を押すまで変わりません/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /適用/ }));

    expect(useProjectStore.getState().project?.musicOffsetSeconds).toBe(12.5);
  });

  it("入れられる範囲の外を打っている間は押せない", async () => {
    const user = userEvent.setup();
    open(makeProject({ musicOffsetSeconds: 0 }), { fileName: "song.mp3" });

    await user.clear(offsetField()!);
    await user.type(offsetField()!, "-3");

    expect(screen.getByRole("button", { name: /適用|範囲/ })).toBeDisabled();
    expect(screen.getByText(/0 より小さくはできません/)).toBeInTheDocument();
  });

  it("同じ約束を2度言わない（曲の控えの説明は1行だけ）", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.getAllByText(/共有した相手には付いていきません/)).toHaveLength(
      1,
    );
    expect(screen.queryByText(/開き直しても入ったままです/)).toBeNull();
  });
});
