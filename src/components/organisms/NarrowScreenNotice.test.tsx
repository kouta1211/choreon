import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NarrowScreenNotice } from "./NarrowScreenNotice";
import { makeProject } from "@/test/factories";

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

    // 板の中で押せるのは、共有しているときのビューアへのリンクだけ
    expect(screen.queryAllByRole("button")).toHaveLength(0);
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

  /* 幅で出し分けているので、PC でウィンドウを狭めても出る。
     「スマホでは」と書くと、その人には嘘になる */
  it("見出しは【端末】ではなく【幅】の話をする", () => {
    render(<NarrowScreenNotice project={makeProject()} />);

    expect(
      screen.getByRole("dialog", { name: /この幅では/ }),
    ).toBeInTheDocument();
  });
});
