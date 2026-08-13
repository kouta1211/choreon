import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PressableButton } from "./PressableButton";

describe("PressableButton", () => {
  it("押せる(onClickはそのまま届く)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PressableButton onClick={onClick}>置き換える</PressableButton>);

    await user.click(screen.getByRole("button", { name: "置き換える" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * リグレッションテスト。
   *
   * 押し心地はポインタのイベントで作っているので、素朴に実装すると
   * 同じボタンに付いている他の操作を上書きして黙って壊す:
   * dnd-kit の並び替え(listeners.onPointerDown)、時間軸のコマの横ドラッグ、
   * 帯へイベントを渡さないための stopPropagation がそれにあたる。
   */
  it("渡されたポインタ操作を消さない(dnd・ドラッグと同居できる)", async () => {
    const user = userEvent.setup();
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();
    render(
      <PressableButton onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        掴む
      </PressableButton>,
    );

    await user.click(screen.getByRole("button", { name: "掴む" }));

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).toHaveBeenCalledTimes(1);
  });

  it("type は呼び出し側が変えられる(フォームの送信ボタン)", () => {
    render(<PressableButton type="submit">登録する</PressableButton>);

    expect(screen.getByRole("button", { name: "登録する" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
