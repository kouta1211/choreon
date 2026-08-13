import { describe, expect, it } from "vitest";
import { ja } from "@/features/i18n/messages/ja";
import { formationName } from "./formationName";

describe("formationName", () => {
  it("形だけの名前はそのまま引く", () => {
    expect(formationName({ shape: "row" }, ja)).toBe("横1列");
  });

  it("人数の内訳を持つ名前は、内訳を渡して組み立てる", () => {
    expect(formationName({ shape: "v", rows: [1, 2, 2] }, ja)).toBe(
      "V字（後1-2-2前）",
    );
  });

  it("内訳が無くても壊れない(空配列を渡す)", () => {
    expect(formationName({ shape: "twoRows" }, ja)).toBe("2列（）");
  });
});
