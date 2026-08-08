import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DurationSecondsInput } from "./DurationSecondsInput";

describe("DurationSecondsInput", () => {
  it("値を変更してEnterで確定するとonCommitが呼ばれる", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <DurationSecondsInput
        label="遷移時間"
        value={1}
        onCommit={onCommit}
        min={0.1}
        max={30}
      />,
    );

    const input = screen.getByLabelText(/遷移時間/);
    await user.clear(input);
    await user.type(input, "2.5");
    await user.keyboard("{Enter}");

    expect(onCommit).toHaveBeenCalledWith(2.5);
  });

  it("値が変わっていなければonCommitを呼ばない", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <DurationSecondsInput
        label="遷移時間"
        value={1}
        onCommit={onCommit}
        min={0.1}
        max={30}
      />,
    );

    const input = screen.getByLabelText(/遷移時間/);
    await user.click(input);
    input.blur();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("範囲外の値はonCommitを呼ばず元の値に戻す", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <DurationSecondsInput
        label="遷移時間"
        value={1}
        onCommit={onCommit}
        min={0.1}
        max={30}
      />,
    );

    const input = screen.getByLabelText(/遷移時間/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "999");
    input.blur();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("1");
  });

  it("allowEmpty=falseの場合、空欄でのblurはonCommit(null)を呼ばない", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <DurationSecondsInput
        label="遷移時間"
        value={1}
        onCommit={onCommit}
        min={0.1}
        max={30}
        allowEmpty={false}
      />,
    );

    const input = screen.getByLabelText(/遷移時間/) as HTMLInputElement;
    await user.clear(input);
    input.blur();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("1");
  });

  it("allowEmpty=true(既定)の場合、空欄でのblurはonCommit(null)を呼ぶ", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <DurationSecondsInput
        label="個別の遷移時間"
        value={2}
        onCommit={onCommit}
        min={0.1}
        max={30}
      />,
    );

    const input = screen.getByLabelText(/個別の遷移時間/);
    await user.clear(input);
    input.blur();

    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it("valueが変わると表示テキストも追従する(保存失敗時のロールバック表示を想定)", () => {
    const { rerender } = render(
      <DurationSecondsInput
        label="遷移時間"
        value={1}
        onCommit={() => {}}
        min={0.1}
        max={30}
      />,
    );
    const input = screen.getByLabelText(/遷移時間/) as HTMLInputElement;
    expect(input.value).toBe("1");

    // ユーザーが入力した後、呼び出し側がロールバックしてvalueを元に戻すケースを再現
    rerender(
      <DurationSecondsInput
        label="遷移時間"
        value={3}
        onCommit={() => {}}
        min={0.1}
        max={30}
      />,
    );
    expect(screen.getByLabelText(/遷移時間/)).toHaveValue(3);
  });
});
