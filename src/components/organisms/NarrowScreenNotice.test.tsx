import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NarrowScreenNotice } from "./NarrowScreenNotice";
import { makeProject } from "@/test/factories";

/**
 * スマホ幅で作成画面を開いた人への案内（2026-08-18 の方針転換）。
 *
 * **幅の出し分けは CSS でやっている**ので、ここでは見られない
 * （jsdom にレイアウトが無い）。確かめるのは中身の3つ —
 * 締め出さないこと・開けないリンクを出さないこと・出すなら正しい先。
 */
describe("NarrowScreenNotice", () => {
  it("「このまま開く」で消える。締め出さない", async () => {
    const user = userEvent.setup();
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText(/このまま開く/));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /** 押しても開けないリンクを置かない */
  it("共有していない作品では、見る側への出口を出さない", () => {
    render(
      <NarrowScreenNotice
        project={makeProject({ isShared: false, shareToken: null })}
      />,
    );

    expect(screen.queryByText(/見るだけならこちら/)).not.toBeInTheDocument();
    // 説明の文は残す（配られた URL なら読める、という案内）
    expect(screen.getByText(/配られた URL/)).toBeInTheDocument();
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

  it("見出しは、どの端末で開くべきかを言う", () => {
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(
      screen.getByRole("dialog", { name: /PC かタブレットで/ }),
    ).toBeInTheDocument();
  });
});
