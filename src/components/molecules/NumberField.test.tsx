import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberField } from "./NumberField";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import type { ReactNode } from "react";

/**
 * 値がいつ入るか、の2通り。
 *
 * **既定は「押すまで変えない」**（実機報告 12-2 / 12-10。効いたのか
 * 分からない、が2回来た）。**新規作成の板だけが「離れたら入る」**
 * （2026-08-22。まだ動かす相手が居ないので、押させる理由が無い）。
 *
 * ここが入れ替わると、設定で幅を変えた瞬間に人が動く／作成の板で
 * 打った値が捨てられる、という**逆向きの事故**になるので固定する。
 */

const wrapper = ({ children }: { children: ReactNode }) => (
  <LocaleProvider locale="ja">{children}</LocaleProvider>
);

function setup(commitOn?: "apply" | "blur") {
  const onChange = vi.fn();
  render(
    <NumberField
      label="ステージの幅"
      value={15}
      min={6}
      max={30}
      unit="マス"
      onChange={onChange}
      commitOn={commitOn}
    />,
    { wrapper },
  );
  /* 名前で引くと、単位の「マス」まで名札に混ざる。数を入れる欄は1つ */
  return { onChange, input: screen.getByRole("spinbutton") };
}

describe("NumberField（既定 = 押すまで変えない）", () => {
  it("打っただけでは値が入らない", () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "20" } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/適用を押すまで変わりません/)).toBeInTheDocument();
  });

  it("欄から離れても、まだ入らない", () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("「適用」を押して初めて入る", () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "適用" }));

    expect(onChange).toHaveBeenCalledWith(20);
  });
});

describe("NumberField（blur = 離れた時点で入る）", () => {
  it("欄から離れた時点で入る", () => {
    const { onChange, input } = setup("blur");

    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(20);
  });

  /* 押す相手が無いのにボタンが出ると、押さないと入らないように見える */
  it("「適用」のボタンを出さない", () => {
    const { input } = setup("blur");

    fireEvent.change(input, { target: { value: "20" } });

    expect(screen.queryByRole("button", { name: "適用" })).toBeNull();
    expect(screen.queryByText(/適用を押すまで変わりません/)).toBeNull();
  });

  /* 範囲の外は、離れても入れない。打ったものは消さずに理由を出す */
  it("範囲の外のまま離れたら、入れずに理由を出す", () => {
    const { onChange, input } = setup("blur");

    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/30 より大きくはできません/)).toBeInTheDocument();
    // 打ったものは残す（黙って消さない）
    expect(input).toHaveValue(99);
  });

  it("Enter でも入る", () => {
    const { onChange, input } = setup("blur");

    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(8);
  });
});
