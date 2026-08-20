import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DancerColorPicker } from "./DancerColorPicker";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

function show(value: string, onCommit = vi.fn()) {
  render(
    <LocaleProvider locale="ja">
      <DancerColorPicker value={value} onCommit={onCommit} />
    </LocaleProvider>,
  );
  return onCommit;
}

describe("DancerColorPicker", () => {
  it("既定の6色と、自由に選ぶ口を出す", () => {
    show(DANCER_COLOR_PALETTE[0]);

    for (const color of DANCER_COLOR_PALETTE) {
      expect(screen.getByLabelText(`色を${color}に変更`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("自由に色を選ぶ")).toBeInTheDocument();
  });

  it("既定の色を押すと、その色で確定する", () => {
    const onCommit = show(DANCER_COLOR_PALETTE[0]);

    fireEvent.click(
      screen.getByLabelText(`色を${DANCER_COLOR_PALETTE[2]}に変更`),
    );

    expect(onCommit).toHaveBeenCalledWith(DANCER_COLOR_PALETTE[2]);
  });

  /* React の onChange は「つまみを動かすたび」に走る。そこへ保存を繋ぐと
     1回の操作で何十回も飛ぶので、native の change だけで受けている */
  it("色を選んでいる最中(input)は確定しない", () => {
    const onCommit = show(DANCER_COLOR_PALETTE[0]);
    const input = screen.getByLabelText("自由に色を選ぶ");

    fireEvent.input(input, { target: { value: "#123456" } });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("選ぶ画面を閉じたとき(change)に、その色で確定する", () => {
    const onCommit = show(DANCER_COLOR_PALETTE[0]);
    const input = screen.getByLabelText("自由に色を選ぶ");

    fireEvent.change(input, { target: { value: "#123456" } });

    expect(onCommit).toHaveBeenCalledWith("#123456");
  });

  /* 大文字のまま保存すると、同じ色なのに6色の照合(文字列の一致)から
     漏れて「選ばれていない」ことになる */
  it("大文字で返ってきても、小文字に揃えてから確定する", () => {
    const onCommit = show("#123456");
    const input = screen.getByLabelText("自由に色を選ぶ");

    fireEvent.change(input, { target: { value: "#ABCDEF" } });

    expect(onCommit).toHaveBeenCalledWith("#abcdef");
  });

  it("いまと同じ色に選び直したときは、保存しない", () => {
    const onCommit = show("#123456");
    const input = screen.getByLabelText("自由に色を選ぶ");

    fireEvent.change(input, { target: { value: "#123456" } });

    expect(onCommit).not.toHaveBeenCalled();
  });
});
