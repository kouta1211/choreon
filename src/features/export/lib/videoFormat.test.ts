import { describe, expect, it } from "vitest";
import { pickVideoFormat, videoFileName } from "./videoFormat";
import { frameTimes, stageRect } from "./frameLayout";

describe("pickVideoFormat", () => {
  // 配る先はスマートフォンで、LINEなどにそのまま流される。
  // webm は iPhone で開けないことがあるので、使えるなら mp4 を選ぶ
  it("mp4 が使えるなら mp4 を選ぶ", () => {
    const format = pickVideoFormat((mimeType) => mimeType.startsWith("video/"));

    expect(format?.extension).toBe("mp4");
  });

  it("mp4 が無ければ webm へ落ちる", () => {
    const format = pickVideoFormat((mimeType) =>
      mimeType.startsWith("video/webm"),
    );

    expect(format?.extension).toBe("webm");
    expect(format?.mimeType).toContain("vp9");
  });

  // 1つも無い端末では、書き出しの入口そのものを出さない
  it("どれも使えなければ null", () => {
    expect(pickVideoFormat(() => false)).toBeNull();
  });
});

describe("videoFileName", () => {
  it("作品名をそのまま使う", () => {
    expect(videoFileName("発表会A", "mp4")).toBe("発表会A.mp4");
  });

  it("ファイル名に使えない文字を落とす", () => {
    expect(videoFileName('a/b:c*d?e"f<g>h|i', "webm")).toBe("abcdefghi.webm");
  });

  it("空白は詰める", () => {
    expect(videoFileName("春 の 発表会", "mp4")).toBe("春_の_発表会.mp4");
  });

  // 名前が絵文字だけ・記号だけの作品もある
  it("残るものが無ければ既定の名前にする", () => {
    expect(videoFileName("///", "mp4")).toBe("formation.mp4");
  });
});

describe("stageRect", () => {
  // 引き伸ばすと隊形が別の形になる。比を保って中に収める
  it("ステージの縦横比を保つ", () => {
    const rect = stageRect(1920, 1080, 14, 10);

    expect(rect.width / rect.height).toBeCloseTo(1.4, 5);
    // 高さが先に詰まるので、上下の余白は指定ぶんだけ
    expect(rect.y).toBeCloseTo(1080 * 0.06, 5);
  });

  it("中央に置く", () => {
    const rect = stageRect(1920, 1080, 14, 10);

    expect(rect.x + rect.width / 2).toBeCloseTo(960, 5);
    expect(rect.y + rect.height / 2).toBeCloseTo(540, 5);
  });

  it("縦長のステージでも縁からはみ出さない", () => {
    const rect = stageRect(1280, 720, 6, 12);

    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(720 * 0.06 - 0.001);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1280);
  });
});

describe("frameTimes", () => {
  it("最後の時刻を必ず含む(最後の隊形が出ないと意味が無い)", () => {
    const times = frameTimes(0, 1, 30);

    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(1);
  });

  it("シーンが1つだけなら1コマ", () => {
    expect(frameTimes(4, 4, 30)).toEqual([4]);
  });
});
