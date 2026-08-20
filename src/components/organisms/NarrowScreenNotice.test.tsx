import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NarrowScreenNotice } from "./NarrowScreenNotice";
import { makeProject } from "@/test/factories";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockReset());

/**
 * 狭い幅で作成画面を開いた人への案内（2026-08-18 の方針転換、
 * 2026-08-20 に逃げ道を閉じた）。
 *
 * **幅の出し分けは CSS でやっている**ので、ここでは見られない
 * （jsdom にレイアウトが無い）。確かめるのは中身の3つ —
 * 抜け道が無いこと・開けないリンクを出さないこと・出すなら正しい先。
 */
describe("NarrowScreenNotice", () => {
  /* 2026-08-20 に user の判断で閉じた。以前は「このまま開く(非推奨)」で
     入れたが、入れても操作できない画面へ通していただけだった */
  it("この板から先へ進む道は無い", async () => {
    const user = userEvent.setup();
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(screen.queryByText(/このまま開く/)).toBeNull();

    // 板の中を押しても、後ろの作成画面へは戻れない
    await user.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  /** 押しても開けないリンクを置かない */
  it("共有していない作品では、見る側への出口を出さない", () => {
    render(
      <NarrowScreenNotice
        project={makeProject({ isShared: false, shareToken: null })}
      />,
    );

    expect(screen.queryByText(/見るだけならこちら/)).not.toBeInTheDocument();
    // 開く先が無くても、貼って開く口は残す（そこが唯一の出口）
    expect(screen.getByLabelText(/共有リンクを貼って開く/)).toBeInTheDocument();
  });

  it("共有していれば、合鍵つきのビューアへ行ける", () => {
    render(
      <NarrowScreenNotice
        project={makeProject({
          id: "project-9",
          isShared: true,
          shareToken: "token-9",
        })}
      />,
    );

    expect(screen.getByText(/見るだけならこちら/).getAttribute("href")).toContain(
      "/view/project-9?t=token-9",
    );
  });

  /* 幅で出し分けているので、PC でウィンドウを狭めても出る。
     「スマホでは」と書くと、その人には嘘になる */
  it("見出しは【端末】ではなく【幅】の話をする", () => {
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(
      screen.getByRole("dialog", { name: /ブラウザ幅では操作できません/ }),
    ).toBeInTheDocument();
  });
});

/* この板は行き止まりなので、開ける先を1つ置いた（2026-08-20）。
   いま開いている作品とは関係なく、配られたリンクを開くための口 */
describe("NarrowScreenNotice の「共有リンクを貼って開く」", () => {
  const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  async function paste(text: string) {
    const user = userEvent.setup();
    render(<NarrowScreenNotice project={makeProject()} />);
    await user.type(screen.getByLabelText(/共有リンクを貼って開く/), text);
    await user.click(screen.getByRole("button", { name: "開く" }));
    return user;
  }

  it("貼ったリンクの作品を、見る側で開く", async () => {
    await paste(`https://choreon.vercel.app/view/p1?t=${TOKEN}`);

    expect(push).toHaveBeenCalledWith(`/view/p1?t=${TOKEN}`);
  });

  /* 貼られたのが本番のURLでも、開くのはこのアプリの中。
     持っていくのは合鍵とポジションだけ */
  it("ポジション付きのリンクも、そのまま持っていく", async () => {
    await paste(`/view/p1?t=${TOKEN}&p=dancer-3`);

    expect(push).toHaveBeenCalledWith(`/view/p1?t=${TOKEN}&p=dancer-3`);
  });

  it("読めないものを貼ったら、その場で言って移動しない", async () => {
    await paste("これはただの文です");

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/共有リンクとして読めません/);
  });

  it("何も貼っていないときは押せない", () => {
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(screen.getByRole("button", { name: "開く" })).toBeDisabled();
  });
});
