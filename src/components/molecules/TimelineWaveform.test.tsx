import { describe, expect, it, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { motionValue } from "motion/react";
import { TimelineWaveform } from "./TimelineWaveform";
import type { Waveform } from "@/features/music/lib/waveformPeaks";
import type { Placement } from "@/features/music/lib/placement";


/**
 * **軸の秒は【作品の時間】。曲の秒とは頭出しのぶんずれる。**
 *
 * ここで縛るのは、純粋関数ではなく**この部品へ何を渡すか**。
 * `beatTimesInWindow` にも `peakBetween` にもテストはあるが、
 * どちらも「正しい引数が来た前提」でしか答えを持っていない。
 * 実際に踏んだのは【渡す値の取り違え】の方だった（2026-08-26）:
 *
 * - 拍の原点へ `musicOffsetSeconds` を渡していた（原点の二重足し）
 * - 波形の引きに頭出しを足していなかった（音と波形がずれる）
 *
 * 頭出しが 0 の作品では**どちらも同じ答えになって見えない**ので、
 * 0 でない頭出しで縛る。
 */

/** Canvas は jsdom に無い。呼ばれた命令を並べて覚える偽物を差す */
type Call = { op: string; args: number[] };

function stubCanvas(): Call[] {
  const calls: Call[] = [];
  const context = {
    setTransform: () => {},
    clearRect: () => {},
    fillRect: (...args: number[]) => calls.push({ op: "fillRect", args }),
    fillText: () => {},
    fillStyle: "",
    font: "",
    textBaseline: "",
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return calls;
}

beforeAll(() => {
  // 端末の画素密度。1に固定しないと座標が2倍になる環境がある
  Object.defineProperty(window, "devicePixelRatio", { value: 1, writable: true });
});

const WIDTH = 240;
const PX_PER_SECOND = 40;
const BPM = 120; // 1拍 = 0.5秒 = 20px

/**
 * 山を1秒ごとに1つ持つ波形。**10秒目だけが高い。**
 * どの秒を引いたかが、描かれた棒の高さで分かる形にしてある。
 */
function makeWaveform(): Waveform {
  const peaks = new Float32Array(30);
  peaks[10] = 1;
  return { peaks, durationSeconds: 30 };
}

function draw(props: {
  songOffsetSeconds?: number;
  originSeconds?: number;
  placements?: Placement[];
}) {
  const calls = stubCanvas();
  render(
    <TimelineWaveform
      waveform={makeWaveform()}
      scrollX={motionValue(0)}
      originPx={0}
      pxPerSecond={PX_PER_SECOND}
      width={WIDTH}
      height={40}
      playheadSeconds={null}
      placements={
        props.placements ?? [
          {
            fromBeat: 0,
            atSeconds: props.originSeconds ?? 0,
            secondsPerBeat: 60 / BPM,
          },
        ]
      }
      songOffsetSeconds={props.songOffsetSeconds ?? 0}
    />,
  );
  return calls;
}

/** 拍線は幅1pxで、帯の下半分だけを塗る。そのxを拾う */
function beatLineXs(calls: Call[], height = 40): number[] {
  return calls
    .filter(({ op, args }) => op === "fillRect" && args[2] === 1 && args[1] === height * 0.25)
    .map(({ args }) => args[0]);
}

/** 波形の棒は幅1pxで、中心から上下へ伸びる。いちばん高いもののxを拾う */
function tallestWaveformX(calls: Call[]): number {
  const bars = calls.filter(({ op, args }) => op === "fillRect" && args[2] === 1 && args[1] !== 10);
  let best = bars[0];
  for (const bar of bars) if (bar.args[3] > best.args[3]) best = bar;
  return best.args[0];
}

describe("TimelineWaveform に渡す、2つの原点", () => {
  /**
   * ⚠️ **拍で割り切れる頭出しを選ばない。** 8秒はちょうど16拍なので、
   * 拍の原点へ足し込んでも線は1本も動かず、**壊しても緑のまま**になる
   * （最初に書いたときこれで空振りした）。9.4秒 = 18.8拍 で縛る。
   */
  const OFFSET = 9.4;

  it("波形は【曲の時間】で引く — 頭出しのぶんだけ左へ寄る", () => {
    // 頭出し 0 なら、10秒目の山は軸の10秒 = 400px。窓(240px)の外
    const withoutOffset = draw({ songOffsetSeconds: 0 });
    expect(tallestWaveformX(withoutOffset)).not.toBeCloseTo(24, 0);

    // 頭出し 9.4秒 なら、10秒目の山は軸の0.6秒 = 24px に来る
    const withOffset = draw({ songOffsetSeconds: OFFSET });
    expect(tallestWaveformX(withOffset)).toBeGreaterThanOrEqual(22);
    expect(tallestWaveformX(withOffset)).toBeLessThanOrEqual(26);
  });

  it("拍線は【作品の時間】で引く — 頭出しを変えても1本も動かない", () => {
    const withoutOffset = beatLineXs(draw({ songOffsetSeconds: 0 }));
    const withOffset = beatLineXs(draw({ songOffsetSeconds: OFFSET }));

    // 1拍 = 0.5秒 = 20px。軸の0秒から等間隔に並ぶ
    expect(withoutOffset.slice(0, 4)).toEqual([0, 20, 40, 60]);
    expect(withOffset).toEqual(withoutOffset);
  });

  it("拍の原点を動かしたときだけ、拍線がずれる", () => {
    const shifted = beatLineXs(draw({ originSeconds: 0.25 }));
    // 0.25秒 = 10px ぶん右へ
    expect(shifted.slice(0, 3)).toEqual([10, 30, 50]);
  });
});


/* ── 曲の区切り（2026-09-15）──
   `beatWindows` そのものの試験は beatWindows.test.ts にある。ここで縛るのは
   **配線** — 描く側が窓を割らずに1つの速さで引き通していないか。
   純粋関数が正しくても、呼び出し側が先頭の区間だけ渡せば2曲目から全部
   ずれる（`.claude/rules/testing.md` 4節「移した先を潰すまでやる」）。 */
describe("区切りをまたぐと、拍線の間隔が変わる", () => {
  /** 0〜3秒は BPM120（1拍20px）、3秒から BPM240（1拍10px） */
  const TWO_SONGS: Placement[] = [
    { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
    { fromBeat: 6, atSeconds: 3, secondsPerBeat: 0.25 },
  ];

  it("区切りより手前は 20px 刻み、その先は 10px 刻みになる", () => {
    const xs = beatLineXs(draw({ placements: TWO_SONGS }));

    // 手前（0〜120px）は1拍20px
    expect(xs.filter((x) => x < 120)).toEqual([0, 20, 40, 60, 80, 100]);
    // 区切り（3秒＝120px）から先は1拍10px
    expect(xs.filter((x) => x >= 120).slice(0, 4)).toEqual([
      120, 130, 140, 150,
    ]);
  });

  it("区切りが1つのときは、今までどおり等間隔のまま", () => {
    const xs = beatLineXs(draw({}));
    expect(xs.slice(0, 4)).toEqual([0, 20, 40, 60]);
  });
});
