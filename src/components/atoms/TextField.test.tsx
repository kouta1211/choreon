import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("名前で引ける", () => {
    render(<TextField label="メールアドレス" />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
  });

  /* 名前を隠しても、読み上げには残す。プレースホルダだけの欄は、
     読み上げでは「何を入れる所か」が分からない */
  it("名前を隠しても、読み上げからは引ける", () => {
    render(<TextField label="新しいプロジェクト名" isLabelVisible={false} />);

    expect(screen.queryByText("新しいプロジェクト名")).toBeInTheDocument();
    expect(screen.getByLabelText("新しいプロジェクト名")).toBeInTheDocument();
  });

  it("失敗しているときだけ aria-invalid を立てる", () => {
    const { rerender } = render(<TextField label="名前" />);
    expect(screen.getByLabelText("名前")).not.toHaveAttribute("aria-invalid");

    rerender(<TextField label="名前" hasError />);
    expect(screen.getByLabelText("名前")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  /* 高さは2段だけ。画面ごとに h-[52px] のような一点物を足さない */
  it("高さは触れる下限(44px)が既定で、lg で主ボタンと同じ段になる", () => {
    const { rerender } = render(<TextField label="名前" />);
    expect(screen.getByLabelText("名前").className).toContain("h-target");

    rerender(<TextField label="名前" size="lg" />);
    expect(screen.getByLabelText("名前").className).toContain("h-target-lg");
  });
});
