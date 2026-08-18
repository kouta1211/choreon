import { describe, expect, it, vi } from "vitest";
import { formationChoices } from "./formationChoices";
import {
  templatesForCount,
  type FormationTemplate,
} from "@/features/canvas/lib/formationTemplates";

/**
 * AI に「この中から選べ」と渡す隊形の一覧（2026-08-18 にテストを追加）。
 *
 * ここが崩れると、**画面に無い隊形を AI が指してくる**。当てる先は
 * アプリが持っている FORMATION_TEMPLATES なので、一覧に無い形を返されても
 * 置けない。壊れても例外にはならず「たまに当たらない」になるため、
 * 気づきにくい。
 *
 * 名前の付け方は呼ぶ側から渡す設計なので、テストでは中身が読める形に固定する。
 */
const nameOf = (template: FormationTemplate) =>
  template.label.rows
    ? `${template.label.shape}:${template.label.rows.join("-")}`
    : template.label.shape;

describe("formationChoices", () => {
  it("その人数で組める形を、形の名前つきで返す", () => {
    const choices = formationChoices(2, nameOf);

    expect(choices).toEqual([
      { shape: "rowPair", name: "rowPair" },
      { shape: "columnPair", name: "columnPair" },
      { shape: "diagonal", name: "diagonal" },
      { shape: "rowFront", name: "rowFront" },
      { shape: "rowBack", name: "rowBack" },
    ]);
  });

  /**
   * この関数が存在する理由。7人の twoRows は、人数の内訳（rows）違いで
   * 2件ある。AI に選ばせるのは形までなので、1つに畳む。
   */
  it("同じ形が内訳違いで複数あっても、1つに畳む", () => {
    const templates = templatesForCount(7);
    const twoRows = templates.filter((t) => t.label.shape === "twoRows");
    // 前提が変わったら気づけるように、実データの側も確かめておく
    expect(twoRows.length).toBeGreaterThan(1);

    const choices = formationChoices(7, nameOf);

    expect(choices.filter((c) => c.shape === "twoRows")).toHaveLength(1);
    expect(choices).toHaveLength(new Set(templates.map((t) => t.label.shape)).size);
  });

  it("畳むときは、先に出てきた方の名前を使う", () => {
    const [first] = templatesForCount(7).filter(
      (t) => t.label.shape === "twoRows",
    );

    const found = formationChoices(7, nameOf).find((c) => c.shape === "twoRows");

    expect(found?.name).toBe(nameOf(first));
  });

  it("畳んで捨てた方の名前は作らない", () => {
    const spy = vi.fn(nameOf);

    const choices = formationChoices(7, spy);

    // 捨てる分まで名前を作ると、翻訳の呼び出しが無駄に増える
    expect(spy).toHaveBeenCalledTimes(choices.length);
    // 畳んでいなければテンプレートの数だけ呼ばれてしまう（ここが無いと、
    // 畳む処理を外してもこのテストは通り抜ける。実際に外して確かめた）
    expect(spy.mock.calls.length).toBeLessThan(templatesForCount(7).length);
  });

  it("並びはテンプレートの順のまま", () => {
    const expected = templatesForCount(5).map((t) => t.label.shape);

    expect(formationChoices(5, nameOf).map((c) => c.shape)).toEqual(expected);
  });

  it.each([0, 1, 11])("組める形が無い人数(%i人)なら空", (count) => {
    expect(formationChoices(count, nameOf)).toEqual([]);
  });
});
