import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNumberDraft } from "./useNumberDraft";

/**
 * 数を入れる欄の共通の作法。設定の行と曲の頭出しが同じ規則を使うので、
 * ここが正しければ両方が正しい。
 */

/**
 * 戻り値そのものを見たいとき用。画面ではなく**判断**を確かめる
 * （`isDirty` / `justApplied` は画面の出し分けに使うだけの値なので、
 * DOM 越しに読むより直接見た方が分かりやすい）
 */
function mountDraft(params: {
  value: number;
  min: number;
  max: number;
  onChange?: (value: number) => void;
}) {
  const seen: ReturnType<typeof useNumberDraft>[] = [];
  function Probe() {
    const [value, setValue] = useState(params.value);
    seen.push(
      useNumberDraft({
        value,
        min: params.min,
        max: params.max,
        onChange: (next) => {
          setValue(next);
          params.onChange?.(next);
        },
      }),
    );
    return null;
  }
  render(<Probe />);
  return { latest: () => seen[seen.length - 1] };
}

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
      <span data-testid="invalid">{field.invalid ?? "-"}</span>
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

  /* ここから4件は、**丸めるのをやめた**ぶんの決まり（実機報告 12-9）。
     範囲の外・数でないものは受け取らず、理由を**打っている間に**出す。
     打ったものは消さない（消すと「打った数が消えた」に戻る） */
  it("下限より小さい間は受け取らない。理由はその場で出る", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("2");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("数")).toHaveValue("2");
    expect(screen.getByTestId("invalid")).toHaveTextContent("tooSmall");
  });

  it("上限より大きい間も受け取らない", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("999");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("数")).toHaveValue("999");
    expect(screen.getByTestId("invalid")).toHaveTextContent("tooLarge");
  });

  it("数でないものは受け取らない。打ったものは消さない", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("abc");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("数")).toHaveValue("abc");
    expect(screen.getByTestId("invalid")).toHaveTextContent("notANumber");
  });

  it("空欄も受け取らない。空のまま保存したり 0 にしたりしない", async () => {
    const onChange = vi.fn();
    render(<Field min={4} max={30} initial={14} onChange={onChange} />);

    await type("");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("invalid")).toHaveTextContent("notANumber");
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

/**
 * 「更新」を押すまで変えない（実機報告 12-2 / 12-10）。
 *
 * 以前は欄から離れた時点で確定していた。**効いたのかどうかが分からない**
 * という報告が2回来たので、押されたときだけ変える形にした。
 * 打ったまま離れても下書きは残る（見えないところで消えない）。
 */
describe("useNumberDraft（更新を押すまで）", () => {
  it("打っている間は、まだ変わっていないと分かる", () => {
    const onChange = vi.fn();
    const { latest } = mountDraft({ value: 10, min: 4, max: 30, onChange });

    act(() => latest().setDraft("18"));

    expect(latest().isDirty).toBe(true);
    expect(latest().justApplied).toBe(false);
    // **押すまで呼ばない**
    expect(onChange).not.toHaveBeenCalled();
  });

  it("押すと変わり、押したことが分かる", () => {
    const onChange = vi.fn();
    const { latest } = mountDraft({ value: 10, min: 4, max: 30, onChange });

    act(() => latest().setDraft("18"));
    act(() => latest().commit());

    expect(onChange).toHaveBeenCalledWith(18);
    expect(latest().isDirty).toBe(false);
    expect(latest().justApplied).toBe(true);
  });

  it("同じ数を打ち直しただけなら、更新は出さない", () => {
    const { latest } = mountDraft({ value: 10, min: 4, max: 30 });

    act(() => latest().setDraft("10"));

    expect(latest().isDirty).toBe(false);
  });

  /** 押せないようにしてあるが、Enter からも来るのでここでも止める */
  it("範囲外は押しても効かない。打ったものはそのまま残る", () => {
    const onChange = vi.fn();
    const { latest } = mountDraft({ value: 10, min: 4, max: 30, onChange });

    act(() => latest().setDraft("99"));
    expect(latest().invalid).toBe("tooLarge");

    act(() => latest().commit());

    expect(onChange).not.toHaveBeenCalled();
    expect(latest().correction).toBe("tooLarge");
    expect(latest().draft).toBe("99");
    expect(latest().justApplied).toBe(false);
  });

  it("打ち直すと「更新しました」は消える", () => {
    const { latest } = mountDraft({ value: 10, min: 4, max: 30 });

    act(() => latest().setDraft("18"));
    act(() => latest().commit());
    expect(latest().justApplied).toBe(true);

    act(() => latest().setDraft("19"));
    expect(latest().justApplied).toBe(false);
  });
});
