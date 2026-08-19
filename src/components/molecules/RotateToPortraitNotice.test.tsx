import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RotateToPortraitNotice } from "./RotateToPortraitNotice";

/**
 * 出し分けは CSS のメディアクエリなので、jsdom では「見えているか」を
 * 確かめられない（jsdom はレイアウトを持たない）。ここで縛るのは
 * **仕掛けが外れていないこと**。クラスが外れると、どの端末でも
 * 出っぱなしになる — 画面を見るまで気づけない壊れ方をする。
 */
describe("RotateToPortraitNotice", () => {
  it("向きで出し分ける仕掛けが外れていない", () => {
    render(<RotateToPortraitNotice />);
    const panel = screen.getByRole("dialog");

    /* 出し分けは globals.css の .landscape-only（既定は display:none、
       横向きかつ背が低いときだけ flex）。クラスが外れると、
       **どの端末でも出っぱなし**になる */
    expect(panel.className).toContain("landscape-only");
  });

  it("読み上げ用の名前が付いている", () => {
    render(<RotateToPortraitNotice />);
    expect(
      screen.getByRole("dialog", { name: "縦向きでご覧ください" }),
    ).toBeInTheDocument();
  });
});
