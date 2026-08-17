import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNumberDraft } from "./useNumberDraft";

/**
 * 数を入れる欄の共通の作法。設定の行と曲の頭出しが同じ規則を使うので、
 * ここが正しければ両方が正しい。
 */
function Field({
  min,
  max,
  initial,
  onChange,
}: {
  min: number;
  max: number;
  initial: number;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  const field = useNumberDraft({
    value,
    min,
    max,
    onChange: (next) => {
      setValue(next);
      onChange(next);
    },
  });

  return (
    <div>
      <input
        aria-label="数"
        value={field.draft}
        onChange={(event) => field.setDraft(event.target.value)}
        onBlur={field.commit}
      />
      <button type="button">よそ</button>
      <span data-testid="correction">{field.correction ?? "-"}</span>
    </div>
  );
}

async function type(text: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText("数");
  await user.clear(input);
  if (text) await user.type(input, text);
  await user.click(screen.getByText("よそ")); // 欄から離れる
  return user;
}

describe("useNumberDraft", () => {
  /**
   * 1文字打つたびに丸めると、下限より小さい桁から始まる数が
   * どうやっても入力できない(下限6のとき「10」の「1」で 6 に化ける)。
   */
  it("打っている間は丸めない。離れたときに1回だけ丸める", async () => {
    const onChange = vi.fn();
    render(<Field min={6} max={30} initial={14} onChange={onChange} />);

    const user = userEvent.setup();
    const input = screen.getByLabelText("数");
    await user.clear(input);
    await user.type(input, "1");
    expect(input).toHaveValue("1"); // まだ 6 に化けていない

    await user.type(input, "0");
    await user.click(screen.getByText("よそ"));

    expect(onChange).toHaveBeenCalledWith(10);
    expect(input).toHaveValue("10");
  });

  it("下限より小さければ下限へ直し、理由を返す", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("2");

    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByTestId("correction")).toHaveTextContent("tooSmall");
  });

  it("上限より大きければ上限へ直し、理由を返す", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("999");

    expect(onChange).toHaveBeenCalledWith(30);
    expect(screen.getByTestId("correction")).toHaveTextContent("tooLarge");
  });

  it("数でないものは前の値へ戻し、理由を返す", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("abc");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("数")).toHaveValue("14");
    expect(screen.getByTestId("correction")).toHaveTextContent("notANumber");
  });

  it("空欄も前の値へ戻す。空のまま保存したり 0 にしたりしない", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("数")).toHaveValue("14");
  });

  it("範囲の中ならそのまま通り、理由は出ない", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("12");

    expect(onChange).toHaveBeenCalledWith(12);
    expect(screen.getByTestId("correction")).toHaveTextContent("-");
  });

  // 直した理由が出たままだと、次に打ち始めても赤い文が残って見える
  it("打ち始めたら、直した理由は消える", async () => {
    render(<Field min={4} max={30} initial={14} onChange={vi.fn()} />);

    await type("2");
    expect(screen.getByTestId("correction")).toHaveTextContent("tooSmall");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("数"), "5");
    expect(screen.getByTestId("correction")).toHaveTextContent("-");
  });
});
