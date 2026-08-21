import { describe, expect, it } from "vitest";
import { isTextEntryElement } from "./textEntry";

/**
 * ここが false を返し損ねると、**打っている最中にショートカットが効く**。
 * 作品名を打っている途中の Delete でダンサーが消える、という壊れ方をする。
 */
function element(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe("isTextEntryElement", () => {
  it("入力の欄はすべて拾う", () => {
    expect(isTextEntryElement(element("<input />"))).toBe(true);
    expect(isTextEntryElement(element("<textarea></textarea>"))).toBe(true);
    expect(isTextEntryElement(element("<select></select>"))).toBe(true);
  });

  it("contenteditable の中も拾う", () => {
    const editable = element('<div contenteditable="true"></div>');
    expect(isTextEntryElement(editable)).toBe(true);
  });

  it("ふつうの要素は拾わない（ここでショートカットを止めない）", () => {
    expect(isTextEntryElement(element("<button></button>"))).toBe(false);
    expect(isTextEntryElement(element("<div></div>"))).toBe(false);
  });

  it("要素でないもの（null・window）は拾わない", () => {
    expect(isTextEntryElement(null)).toBe(false);
    expect(isTextEntryElement(window)).toBe(false);
  });
});
