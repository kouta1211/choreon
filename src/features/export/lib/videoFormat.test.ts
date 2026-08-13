import { describe, expect, it } from "vitest";
import { pickVideoFormat, videoFileName } from "./videoFormat";

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
