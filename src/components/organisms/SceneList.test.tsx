import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneList } from "./SceneList";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as scenesApi from "@/features/scene/api/scenes";

import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const SCENES = [
  makeScene({ timeSeconds: 0 }),
  makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1, timeSeconds: 2 }),
];

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * カードのどこを押したら何が起きるか。
 *
 * 以前はミニチュア(SceneThumbnail)だけが押せて、幅いっぱいのカードのうち
 * 左端の小さな四角しか反応しなかった。カード全体を押せるようにしたぶん、
 * 中の操作ボタンまで「選択」に飲み込まれていないかを一緒に確かめる。
 */
describe("SceneList", () => {
  it("カードのシーン名を押すと、そのシーンに切り替わる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getByText("シーン2"));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });

  it("カードの時刻の行を押しても、そのシーンに切り替わる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getByText(/0:02\.0/));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });

  // 選択処理(selectSceneManually)は再生も止めるので、isPlaying が true の
  // ままかどうかで「カードのクリック処理が走ったか」を外から見分けられる
  it("操作ボタンを押したときは、カードの選択処理まで走らない", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: true });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getAllByLabelText("シーン名を変更")[0]);

    expect(screen.getByLabelText("シーン名")).toBeInTheDocument();
    expect(useUIStore.getState().isPlaying).toBe(true);
  });

  it("鉛筆を押すとシーン名を変更できる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "renameScene").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getAllByLabelText("シーン名を変更")[0]);
    const input = screen.getByLabelText("シーン名");
    await user.clear(input);
    await user.type(input, "オープニング{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[0].name).toBe("オープニング");
    });
  });

  it("選択中シーンの時刻を変更できる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText(/曲のこの位置/);
    await user.clear(input);
    await user.type(input, "3.5");
    await user.tab();

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(3.5);
    });
    expect(scenesApi.updateSceneTimes).toHaveBeenCalledWith(expect.anything(), [
      { id: "scene-2", timeSeconds: 3.5 },
    ]);
  });

  // 時刻は分秒でも打てる。稽古で「1分20秒あたり」と言うときの形
  it("分秒の形(1:20)でも受け付ける", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText(/曲のこの位置/);
    await user.clear(input);
    await user.type(input, "1:20");
    await user.tab();

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(80);
    });
  });

  // これが絶対時刻にした理由そのもの。触っていないシーンは動かない
  it("既定では、変えたシーン以外の時刻は動かない", async () => {
    const three = [
      makeScene({ timeSeconds: 0 }),
      makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
      makeScene({ id: "scene-3", orderIndex: 2, timeSeconds: 5 }),
    ];
    useProjectStore.setState({ scenes: three });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText(/曲のこの位置/);
    await user.clear(input);
    await user.type(input, "3");
    await user.tab();

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(3);
    });
    expect(useProjectStore.getState().scenes[2].timeSeconds).toBe(5);
  });

  // 先頭にも時刻はある(0秒とは限らない)ので、入力欄は出す
  it("先頭シーンにも時刻の入力を出す", () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });

    render(<SceneList project={makeProject()} />);

    expect(screen.getByLabelText(/曲のこの位置/)).toBeInTheDocument();
  });

  // ×は「小さいので誤タップしやすい」場所にある。押した瞬間に消えるのでは
  // なく、必ず確認をはさむ(シーン削除は元に戻せない)
  it("サムネイルの×を押すと、即削除ではなく確認ダイアログを出す", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getByLabelText("「シーン2」を削除"));

    expect(useProjectStore.getState().scenes).toHaveLength(2);
    expect(useUIStore.getState().confirm?.title).toBe(
      "「シーン2」を削除しますか?",
    );
  });

  it("削除を確認するとSupabase削除後にローカルからも消え、別のシーンが選択される", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "deleteScene").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <>
        <SceneList project={makeProject()} />
        <ConfirmDialog />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText("「シーン1」を削除しますか?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });
});
