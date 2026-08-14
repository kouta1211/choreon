import { describe, expect, it, vi } from "vitest";
import { drawFrame, type DrawFrameInput } from "./drawFrame";

/**
 * 呼ばれた順に記録するだけの偽キャンバス。
 *
 * jsdom は 2D コンテキストを持たないので、実物は使えない。ここで見たいのは
 * 「絵が綺麗か」ではなく **描く順番と、描く/描かないの判断** なので、
 * 記録できれば足りる(面を塗る前に格子を引けば、格子は隠れる)。
 */
function fakeContext() {
  const calls: string[] = [];
  const texts: string[] = [];
  const fills: string[] = [];

  const context = {
    clearRect: vi.fn(() => calls.push("clearRect")),
    fillRect: vi.fn(() => calls.push(`fillRect:${context.fillStyle}`)),
    strokeRect: vi.fn(() => calls.push(`strokeRect:${context.strokeStyle}`)),
    beginPath: vi.fn(() => calls.push("beginPath")),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(() => calls.push("arc")),
    fill: vi.fn(() => {
      calls.push("fill");
      fills.push(String(context.fillStyle));
    }),
    stroke: vi.fn(() => calls.push("stroke")),
    fillText: vi.fn((text: string) => {
      calls.push("fillText");
      texts.push(text);
    }),
    fillStyle: "" as string,
    strokeStyle: "" as string,
    lineWidth: 0,
    lineCap: "butt" as CanvasLineCap,
    font: "",
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
  };

  return { context, calls, texts, fills };
}

const COLORS = {
  background: "#000",
  stage: "#111",
  grid: "#222",
  line: "#333",
  label: "#eee",
  // 保存色 → いまのテーマでの実測値。ここを通っているかを見たいので目印を付ける
  dancer: (color: string) => `themed(${color})`,
};

function input(overrides: Partial<DrawFrameInput> = {}): DrawFrameInput {
  return {
    width: 640,
    height: 360,
    stageWidth: 8,
    stageHeight: 6,
    positions: [{ dancerId: "d1", x: 2, y: 3, rotationAngle: 0 }],
    dancers: { d1: { id: "d1", name: "あかり", color: "#ff0000" } },
    colors: COLORS,
    showNames: false,
    ...overrides,
  };
}

describe("drawFrame", () => {
  it("消してから、地・ステージ面・格子・縁の順に描く", () => {
    const { context, calls } = fakeContext();

    drawFrame(context as unknown as CanvasRenderingContext2D, input());

    expect(calls[0]).toBe("clearRect");
    expect(calls[1]).toBe(`fillRect:${COLORS.background}`);
    expect(calls[2]).toBe(`fillRect:${COLORS.stage}`);
    // 格子(stroke)は面のあと、縁(strokeRect)はそのあと
    expect(calls.indexOf("stroke")).toBeGreaterThan(2);
    expect(calls.indexOf(`strokeRect:${COLORS.line}`)).toBeGreaterThan(
      calls.indexOf("stroke"),
    );
  });

  // 動画だけを渡された人には、画面の向きを知る手がかりが他に無い
  it("上下がどちらかを必ず書く", () => {
    const { context, texts } = fakeContext();

    drawFrame(context as unknown as CanvasRenderingContext2D, input());

    expect(texts).toContain("バックステージ");
    expect(texts).toContain("客席側");
  });

  it("ダンサーの色は、テーマで解決した色で塗る", () => {
    const { context, fills } = fakeContext();

    drawFrame(context as unknown as CanvasRenderingContext2D, input());

    expect(fills).toContain("themed(#ff0000)");
  });

  it("名前を出さない設定なら、名前は書かない", () => {
    const { context, texts } = fakeContext();

    drawFrame(context as unknown as CanvasRenderingContext2D, input());

    expect(texts).not.toContain("あかり");
  });

  it("名前を出す設定なら、影と本体で2回書く", () => {
    const { context, texts } = fakeContext();

    drawFrame(
      context as unknown as CanvasRenderingContext2D,
      input({ showNames: true }),
    );

    // 暗い地でも明るい紙でも読めるよう、影を先に置いてから重ねる
    expect(texts.filter((text) => text === "あかり")).toHaveLength(2);
  });

  // 途中から出てくる人・捌ける人は、その時刻の配置に居ないことがある
  it("知らないダンサーの配置は飛ばす", () => {
    const { context, calls } = fakeContext();

    drawFrame(
      context as unknown as CanvasRenderingContext2D,
      input({
        positions: [{ dancerId: "unknown", x: 1, y: 1, rotationAngle: 0 }],
      }),
    );

    expect(calls).not.toContain("arc");
  });

  it("時刻は渡されたときだけ書く", () => {
    const without = fakeContext();
    drawFrame(without.context as unknown as CanvasRenderingContext2D, input());
    expect(without.texts).not.toContain("0:12.0");

    const withClock = fakeContext();
    drawFrame(
      withClock.context as unknown as CanvasRenderingContext2D,
      input({ clock: "0:12.0" }),
    );
    expect(withClock.texts).toContain("0:12.0");
  });
});
