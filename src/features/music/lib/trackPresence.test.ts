import { describe, expect, it } from "vitest";
import { trackPresence } from "./trackPresence";

/**
 * **3つの状態が混ざらないか。**
 *
 * 混ざると、鳴らせないのに鳴らせるつもりの画面（missing を ready と
 * 読む）か、曲で組んだ作品を「曲なし」と描く画面（missing を none と
 * 読む）になる。後者が user の報告そのもの（2026-09-25）。
 */
describe("trackPresence", () => {
  it("どちらも無ければ、曲を入れていない", () => {
    expect(trackPresence(null, null)).toEqual({ kind: "none" });
  });

  it("この端末に音源があれば、鳴らせる", () => {
    expect(trackPresence("song.mp3", "song.mp3")).toEqual({
      kind: "ready",
      fileName: "song.mp3",
    });
  });

  /** ここが今回の穴。別のブラウザで開くと必ずこうなる */
  it("名前だけ残っていれば、鳴らせないが曲はある", () => {
    expect(trackPresence(null, "song.mp3")).toEqual({
      kind: "missing",
      fileName: "song.mp3",
    });
  });

  /* **答えが分かれる値で書く。** 端末と作品で名前が違うときに
     どちらを採るかは、同じ名前で書くと確かめられない */
  it("両方あって名前が食い違うときは、端末の側を出す", () => {
    expect(trackPresence("いま鳴っている.mp3", "古い名前.mp3")).toEqual({
      kind: "ready",
      fileName: "いま鳴っている.mp3",
    });
  });

  /* `music_title` はただの text 列。空文字が入りうる */
  it("空文字は「無い」と見なす（理由の無い注意書きを出さない）", () => {
    expect(trackPresence(null, "")).toEqual({ kind: "none" });
    expect(trackPresence("", null)).toEqual({ kind: "none" });
  });

  it("空白だけの名前も「無い」", () => {
    expect(trackPresence(null, "   ")).toEqual({ kind: "none" });
  });

  it("前後の空白は落として出す", () => {
    expect(trackPresence(null, "  song.mp3  ")).toEqual({
      kind: "missing",
      fileName: "song.mp3",
    });
  });

  /** 端末が空文字でも、作品が覚えていれば missing へ落ちる */
  it("端末が空で作品が覚えていれば、鳴らせないが曲はある", () => {
    expect(trackPresence("", "song.mp3")).toEqual({
      kind: "missing",
      fileName: "song.mp3",
    });
  });
});
