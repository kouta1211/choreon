import { describe, expect, it } from "vitest";
import {
  isMouseDragStartAllowed,
  isRowSelectClick,
  isTouchDragStartAllowed,
} from "./sceneRowSensors";

/**
 * 行のどこを掴んでも並び替わるようにしたぶん、行の中の操作が「掴んだ」に
 * 飲み込まれないかがここで決まる。画面越しには、指の長押しとマウスの
 * ドラッグを両方再現しないと確かめられないので、規則そのものを見る。
 */
function button(): HTMLElement {
  return document.createElement("button");
}
function input(): HTMLElement {
  return document.createElement("input");
}
function plain(): HTMLElement {
  return document.createElement("div");
}
/** ボタンの中の文字やアイコン。押した先はたいていこちら */
function insideButton(): HTMLElement {
  const wrapper = button();
  const label = document.createElement("span");
  wrapper.append(label);
  return label;
}

describe("isRowSelectClick", () => {
  it("ふつうの場所を押したら、そのシーンを選ぶ", () => {
    expect(isRowSelectClick(plain())).toBe(true);
  });

  it("ボタン・入力欄の上なら、その操作だけを起こす", () => {
    expect(isRowSelectClick(button())).toBe(false);
    expect(isRowSelectClick(input())).toBe(false);
    expect(isRowSelectClick(insideButton())).toBe(false);
  });
});

/**
 * マウスは距離(8px)で見分けられるので、ボタンの上からでも掴める。
 * 動かずに離せば、これまでどおりボタンが押される。
 */
describe("isMouseDragStartAllowed", () => {
  it("ボタンの上からでも掴み始められる", () => {
    expect(isMouseDragStartAllowed(button())).toBe(true);
    expect(isMouseDragStartAllowed(insideButton())).toBe(true);
  });

  it("入力欄の上からは掴み始めない。文字を選べなくなるため", () => {
    expect(isMouseDragStartAllowed(input())).toBe(false);
  });

  it("ふつうの場所からは掴み始められる", () => {
    expect(isMouseDragStartAllowed(plain())).toBe(true);
    expect(isMouseDragStartAllowed(null)).toBe(true);
  });
});

/**
 * 指は長押しで始まるので、ボタンはこれまでどおり除く。ゆっくり押した人が
 * 並び替えを始めてしまい、押したはずの削除が効かない、を避ける。
 */
describe("isTouchDragStartAllowed", () => {
  it("ボタン・入力欄の上からは掴み始めない", () => {
    expect(isTouchDragStartAllowed(button())).toBe(false);
    expect(isTouchDragStartAllowed(insideButton())).toBe(false);
    expect(isTouchDragStartAllowed(input())).toBe(false);
  });

  it("ふつうの場所からは掴み始められる", () => {
    expect(isTouchDragStartAllowed(plain())).toBe(true);
    expect(isTouchDragStartAllowed(null)).toBe(true);
  });
});
