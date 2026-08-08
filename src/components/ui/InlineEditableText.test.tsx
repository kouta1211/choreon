import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineEditableText } from "./InlineEditableText";

describe("InlineEditableText", () => {
  it("通常時は値と『変更』の操作を見せる", () => {
    render(
      <InlineEditableText value="サビ入り" onCommit={vi.fn()} label="シーン名" />,
    );

    expect(screen.getByText("サビ入り")).toBeInTheDocument();
    expect(screen.getByLabelText("シーン名を変更")).toBeInTheDocument();
  });

  it("押すと入力欄に変わり、Enterで確定する", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineEditableText value="サビ入り" onCommit={onCommit} label="シーン名" />,
    );

    await user.click(screen.getByLabelText("シーン名を変更"));
    await user.clear(screen.getByLabelText("シーン名"));
    await user.type(screen.getByLabelText("シーン名"), "ラスサビ{Enter}");

    expect(onCommit).toHaveBeenCalledWith("ラスサビ");
    // 確定後は表示に戻る
    expect(screen.getByLabelText("シーン名を変更")).toBeInTheDocument();
  });

  it("フォーカスが外れても確定する", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <InlineEditableText value="旧" onCommit={onCommit} label="シーン名" />
        <button type="button">ほか</button>
      </>,
    );

    await user.click(screen.getByLabelText("シーン名を変更"));
    await user.clear(screen.getByLabelText("シーン名"));
    await user.type(screen.getByLabelText("シーン名"), "新");
    await user.click(screen.getByRole("button", { name: "ほか" }));

    expect(onCommit).toHaveBeenCalledWith("新");
  });

  it("Escapeで取り消すと確定しない", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineEditableText value="サビ入り" onCommit={onCommit} label="シーン名" />,
    );

    await user.click(screen.getByLabelText("シーン名を変更"));
    await user.type(screen.getByLabelText("シーン名"), "だめ{Escape}");

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("サビ入り")).toBeInTheDocument();
  });

  it("空欄のまま確定しても呼ばない(名前が消えると何か分からなくなるため)", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineEditableText value="サビ入り" onCommit={onCommit} label="シーン名" />,
    );

    await user.click(screen.getByLabelText("シーン名を変更"));
    await user.clear(screen.getByLabelText("シーン名"));
    await user.keyboard("{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("前後の空白だけの違いは変更とみなさない", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineEditableText value="サビ入り" onCommit={onCommit} label="シーン名" />,
    );

    await user.click(screen.getByLabelText("シーン名を変更"));
    await user.type(screen.getByLabelText("シーン名"), "  {Enter}");

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("prefixを渡すと名前の前に表示する(シーン番号など)", () => {
    render(
      <InlineEditableText
        value="サビ入り"
        onCommit={vi.fn()}
        label="シーン名"
        prefix={<span>S3</span>}
      />,
    );

    expect(screen.getByText("S3")).toBeInTheDocument();
  });
});
