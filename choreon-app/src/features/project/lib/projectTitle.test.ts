import { nextAvailableTitle } from "./projectTitle";

describe("nextAvailableTitle", () => {
  it("ぶつかっていなければ、打った名前のまま", () => {
    expect(nextAvailableTitle(["発表会A"], "発表会B")).toBe("発表会B");
    expect(nextAvailableTitle([], "はじめての作品")).toBe("はじめての作品");
  });

  it("同じ名前があれば (2) を足す", () => {
    expect(nextAvailableTitle(["発表会A"], "発表会A")).toBe("発表会A (2)");
  });

  it("(2) も埋まっていれば (3) へ進む", () => {
    expect(
      nextAvailableTitle(["発表会A", "発表会A (2)"], "発表会A"),
    ).toBe("発表会A (3)");
  });

  // 自分で (2) と名付けた作品を、もう一度その名前で作った場合。
  // 「発表会A (2) (2)」のように積み上げない
  it("自分で番号を付けた名前がぶつかったら、番号だけを進める", () => {
    expect(
      nextAvailableTitle(["発表会A", "発表会A (2)"], "発表会A (2)"),
    ).toBe("発表会A (3)");
  });

  it("途中の番号が空いていれば、そこへ入る", () => {
    expect(
      nextAvailableTitle(["発表会A", "発表会A (3)"], "発表会A"),
    ).toBe("発表会A (2)");
  });

  // 一覧から読んだ名前に前後の空白が混ざっていても、同じ名前として扱う
  it("前後の空白は無視して見比べる", () => {
    expect(nextAvailableTitle(["  発表会A  "], "発表会A")).toBe("発表会A (2)");
    expect(nextAvailableTitle(["発表会A"], "  発表会A  ")).toBe("発表会A (2)");
  });

  it("大文字と小文字は別の名前として扱う", () => {
    expect(nextAvailableTitle(["Show"], "show")).toBe("show");
  });
});
