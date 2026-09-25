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

const button = () => screen.getByRole("button", { name: "クリックして測る" });

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
      screen.getByText("▶ で流して、曲に合わせて4回ほどクリックしてください"),
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
      screen.getByRole("button", { name: "クリックして測る" }),
    ).toBeInTheDocument();
  });
});

/**
 * **叩く相手を、その場で鳴らせるか。**
 *
 * 曲のシートは画面全体を覆う板なので、開いている間は下のバーの再生
 * ボタンが押せない。「曲に合わせて叩く」と書いてあるのに鳴らせない、
 * というのが user の詰まり所だった（2026-09-25）。
 */
describe("TapTempoButton（曲を鳴らす）", () => {
  it("鳴らす手立てを渡さなければ、ボタンを出さない", () => {
    useFakeClock();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton onMeasured={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.queryByRole("button", { name: "この区間を流す" })).toBeNull();
  });

  it("渡せば出て、押すとその手立てを呼ぶ", () => {
    useFakeClock();
    const onTogglePlay = vi.fn();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton onMeasured={vi.fn()} onTogglePlay={onTogglePlay} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "この区間を流す" }));

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  /* 答えが分かれる形で書く。鳴っているかどうかで名前が変わる */
  it("鳴っている間は「止める」側の名前になる", () => {
    useFakeClock();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton onMeasured={vi.fn()} isPlaying onTogglePlay={vi.fn()} />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("button", { name: "止める" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "この区間を流す" })).toBeNull();
  });

  /** 鳴らすボタンを押しても、叩いた回数には入れない */
  it("鳴らすボタンは、叩いた回数に数えない", () => {
    const clock = useFakeClock();
    const onMeasured = vi.fn();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton onMeasured={onMeasured} onTogglePlay={vi.fn()} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "この区間を流す" }));
    clock.now += 500;
    fireEvent.click(screen.getByRole("button", { name: "クリックして測る" }));

    // 叩いたのは1回だけなので、まだ速さは出ない
    expect(onMeasured).not.toHaveBeenCalled();
  });
});

/**
 * **測った値が合っているかは、耳でしか確かめられない。**
 * 曲を流したまま重ねて鳴らせば、ずれていれば必ず離れていく。
 */
describe("TapTempoButton（測った速さで鳴らす）", () => {
  it("鳴らす手立てを渡さなければ、ボタンを出さない", () => {
    useFakeClock();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton onMeasured={vi.fn()} />
      </LocaleProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "測った速さで鳴らす" }),
    ).toBeNull();
  });

  it("押すと、その手立てを呼ぶ", () => {
    useFakeClock();
    const onToggleMetronome = vi.fn();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton
          onMeasured={vi.fn()}
          onToggleMetronome={onToggleMetronome}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "測った速さで鳴らす" }));

    expect(onToggleMetronome).toHaveBeenCalledTimes(1);
  });

  /* 答えが分かれる形で書く。鳴っているかで名前と押下状態が変わる */
  it("鳴っている間は、名前と押されている印が変わる", () => {
    useFakeClock();
    render(
      <LocaleProvider locale="ja">
        <TapTempoButton
          onMeasured={vi.fn()}
          isMetronomeOn
          onToggleMetronome={vi.fn()}
        />
      </LocaleProvider>,
    );

    const button = screen.getByRole("button", { name: "鳴らすのをやめる" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: "測った速さで鳴らす" }),
    ).toBeNull();
  });
});
