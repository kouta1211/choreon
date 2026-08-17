import { describe, expect, it } from "vitest";
import { pressableClass } from "./usePressable";

/**
 * 押し心地のクラス。
 *
 * ここで守っているのは1つ ——
 * **面を分け合っている行は縮めない。**
 * 設定の行は1枚の面をずらっと共有しているので、その中の1行だけが縮むと
 * 縁から下の背景が覗いて、**カードごと押し込まれたように見える**
 * （実機報告 03-2）。押下は明暗と内側の影で示す。
 */
describe("pressableClass", () => {
  it("押していないときは、沈みの見た目を付けない", () => {
    expect(pressableClass("primary", false)).not.toContain("scale-");
    expect(pressableClass("primary", false)).not.toContain("brightness-");
  });

  it("ふつうのボタンは縮む", () => {
    expect(pressableClass("primary", true)).toContain("scale-[.965]");
  });

  /** ★ここが 03-2 の直し */
  it("行は縮まない。明暗と内側の影だけ", () => {
    const pressed = pressableClass("row", true);

    expect(pressed).not.toContain("scale-[");
    expect(pressed).toContain("brightness-[.94]");
    expect(pressed).toContain("inset");
  });

  /** 掴んで動かすものは沈めず、浮かせる */
  it("掴むものは浮く", () => {
    expect(pressableClass("lift", true)).toContain("scale-[1.08]");
    expect(pressableClass("lift", true)).not.toContain("brightness-");
  });

  /** 動きを減らしたい人にも、押した状態は要る */
  it("動きを減らす設定では大きさを変えない", () => {
    expect(pressableClass("primary", true)).toContain("motion-reduce:scale-100");
  });
});
