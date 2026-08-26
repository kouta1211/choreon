import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  /* **頭出しの欄は消した**（2026-08-26・第4段）。
     「振付が曲の何秒目から始まるか」は、時間軸の上のバーが持つ。
     欄が戻ってくると、同じことを言う口が2つになる */
  it("頭出しの欄を出さない（時間軸のバーが持つ）", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(offsetField()).not.toBeInTheDocument();
    expect(screen.queryByText(/曲の開始位置/)).not.toBeInTheDocument();
  });

  it("「ここから◯秒聴く」のボタンも出さない", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.queryByRole("button", { name: /秒聴く/ })).toBeNull();
  });

  it("曲があるときは、曲がないときの拍を出さない", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.queryByText("曲がないときの拍")).not.toBeInTheDocument();
  });

  it("同じ約束を2度言わない（曲の控えの説明は1行だけ）", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.getAllByText(/共有した相手には付いていきません/)).toHaveLength(
      1,
    );
    expect(screen.queryByText(/開き直しても入ったままです/)).toBeNull();
  });
});
