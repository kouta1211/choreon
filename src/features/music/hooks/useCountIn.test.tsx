import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { useCountIn } from "./useCountIn";

/**
 * 数え終わりと再生開始のあいだに隙間が空かないことを見る。
 *
 * ここが空くと、メトロノームの isActive
 * (`(isPlaying && …) || isCountingIn`) が一瞬だけ両方 false になり、
 * AudioContext が suspend されて**カウントインのあと音が出なくなる**。
 * 音そのものは jsdom で鳴らせないので、**その一瞬が描画されるかどうか**を
 * 本物の部品と同じ形で観察する。
 */
function Harness({
  beats,
  bpm,
  log,
}: {
  beats: number;
  bpm: number;
  /** 描き直されるたびの isActive。ここが false を挟むと音が切れる */
  log?: boolean[];
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { isCountingIn, remainingBeats, start } = useCountIn(bpm);

  // SceneDock が useMetronome へ渡している式そのもの
  const isActive = isPlaying || isCountingIn;
  useEffect(() => {
    log?.push(isActive);
  });

  return (
    <div>
      <button onClick={() => start(beats, () => setIsPlaying(true))}>
        再生
      </button>
      <span data-testid="active">{isActive ? "鳴る" : "黙る"}</span>
      <span data-testid="remaining">{remainingBeats}</span>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountIn", () => {
  it("予備拍が0なら、その場で始める", () => {
    render(<Harness beats={0} bpm={120} />);

    act(() => {
      screen.getByText("再生").click();
    });

    expect(screen.getByTestId("active")).toHaveTextContent("鳴る");
    expect(screen.getByTestId("remaining")).toHaveTextContent("0");
  });

  it("拍の数だけ数えてから始める", () => {
    render(<Harness beats={4} bpm={120} />);

    act(() => {
      screen.getByText("再生").click();
    });
    expect(screen.getByTestId("remaining")).toHaveTextContent("4");

    // 120BPM = 1拍0.5秒
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("remaining")).toHaveTextContent("3");
  });

  /**
   * 以前は「0 になった」ことを別の useEffect が見てから再生を始めていたため、
   * ここで一度だけ「黙る」が描かれていた。
   */
  it("数え終わりから再生へ、黙る瞬間を挟まない", () => {
    const log: boolean[] = [];
    render(<Harness beats={2} bpm={120} log={log} />);

    act(() => {
      screen.getByText("再生").click();
    });
    expect(screen.getByTestId("active")).toHaveTextContent("鳴る");

    // 数え始めてからの描き直しだけを見る。次の拍のタイマーは effect が
    // 出すので、1拍ずつ進める(まとめて進めると2拍目が仕掛けられる前に
    // 時計だけが過ぎてしまう)
    log.length = 0;
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("remaining")).toHaveTextContent("0");
    expect(screen.getByTestId("active")).toHaveTextContent("鳴る");
    expect(log).not.toContain(false);
  });

  it("数えている途中で取り消せる", () => {
    render(<Harness beats={8} bpm={120} />);

    act(() => {
      screen.getByText("再生").click();
    });
    // 取り消しは usePlaybackToggle が cancel() を呼ぶ形なので、ここでは
    // 数え切らずに片付くことだけを見る(タイマーが残らない)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("remaining")).toHaveTextContent("7");
  });
});
