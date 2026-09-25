import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TapTempoButton } from "./TapTempoButton";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";

/**
 * **叩いた回数を、正しく速さへ渡しているか。**
 *
 * `tapTempo` のテストは「時刻の列 → 速さ」までしか守っていない。
 * ここで縛るのは【どんな時刻を積むか】と【いつ呼び出し側へ渡すか】
 * （.claude/rules/testing.md「純粋関数のテストは、そこへ何を渡すかを
 * 守っていない」）。
 */

/**
 * 時計を止めて、**進める時点をこちらで決める**。
 *
 * ⚠️ 呼ばれた回数で進める作りにしてはいけない。`performance.now()` は
 * motion のアニメーションからも呼ばれるので、こちらが数えていない分まで
 * 進んでしまい、**叩くたびに間が開いて測り直しになる**（実際に踏んだ）。
 */
function useFakeClock() {
  const clock = { now: 1000 };
  vi.spyOn(performance, "now").mockImplementation(() => clock.now);
  return clock;
}

function open() {
  const onMeasured = vi.fn();
  render(
    <LocaleProvider locale="ja">
      <TapTempoButton onMeasured={onMeasured} />
    </LocaleProvider>,
  );
  return { onMeasured };
}

const button = () => screen.getByRole("button", { name: "叩いて測る" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TapTempoButton", () => {
  /* **1回目では呼ばない。** 間隔がまだ無いのに 120 のような数を
     渡すと、叩いただけで速さが書き換わる */
  it("1回叩いただけでは、速さを渡さない", () => {
    useFakeClock();
    const { onMeasured } = open();

    fireEvent.click(button());

    expect(onMeasured).not.toHaveBeenCalled();
  });

  it("2回叩いたら、その間隔の速さを渡す", () => {
    // 0.5秒あけて2回 = BPM 120
    const clock = useFakeClock();
    const { onMeasured } = open();

    fireEvent.click(button());
    clock.now += 500;
    fireEvent.click(button());

    expect(onMeasured).toHaveBeenCalledWith(120);
  });

  /* 答えが分かれる値で書く。刻みが変われば渡る数も変わる */
  it("速く叩けば、速い数が渡る", () => {
    // 0.4秒あけて2回 = BPM 150
    const clock = useFakeClock();
    const { onMeasured } = open();

    fireEvent.click(button());
    clock.now += 400;
    fireEvent.click(button());

    expect(onMeasured).toHaveBeenCalledWith(150);
  });

  it("叩くたびに渡すので、最後は叩いた回数ぶん呼ばれる", () => {
    const clock = useFakeClock();
    const { onMeasured } = open();

    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(button());
      clock.now += 500;
    }

    // 1回目は渡さないので、4回叩いて3回
    expect(onMeasured).toHaveBeenCalledTimes(3);
  });

  it("叩いた回数を画面に出す", () => {
    const clock = useFakeClock();
    open();

    expect(
      screen.getByText("曲に合わせて4回ほど叩いてください"),
    ).toBeInTheDocument();

    fireEvent.click(button());
    clock.now += 500;
    fireEvent.click(button());

    expect(screen.getByText(/2回ぶん/)).toBeInTheDocument();
  });

  /** ボタンの名前は押しても変わらない（何のボタンか分からなくなる） */
  it("押しても、ボタンの名前は変わらない", () => {
    const clock = useFakeClock();
    open();

    fireEvent.click(button());
    clock.now += 500;
    fireEvent.click(button());

    expect(
      screen.getByRole("button", { name: "叩いて測る" }),
    ).toBeInTheDocument();
  });
});
