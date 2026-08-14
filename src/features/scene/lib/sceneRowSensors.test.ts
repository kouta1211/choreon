import { describe, expect, it } from "vitest";
import { isDragStartAllowed } from "./sceneRowSensors";

/**
 * 行のどこを掴んでも並び替わるようにしたぶん、行の中の操作が「掴んだ」に
 * 飲み込まれないかがここで決まる。画面越しには、指の長押しとマウスの
 * ドラッグを両方再現しないと確かめられないので、規則そのものを見る。
 */
describe("isDragStartAllowed", () => {
  it("ふつうの場所からは掴み始められる", () => {
    const div = document.createElement("div");
    expect(isDragStartAllowed(div)).toBe(true);
  });

  it("ボタンの上からは掴み始めない", () => {
    const button = document.createElement("button");
    expect(isDragStartAllowed(button)).toBe(false);
  });

  it("入力欄の上からは掴み始めない", () => {
    const input = document.createElement("input");
    expect(isDragStartAllowed(input)).toBe(false);
  });

  // 押した先はボタンの中の文字やアイコンになる。祖先まで見ないと、
  // 鉛筆や複製を押したつもりが並び替えになる
  it("ボタンの中の文字から押しても掴み始めない", () => {
    const button = document.createElement("button");
    const label = document.createElement("span");
    button.append(label);
    expect(isDragStartAllowed(label)).toBe(false);
  });

  it("要素以外(nullなど)は掴み始めてよい扱いにする", () => {
    expect(isDragStartAllowed(null)).toBe(true);
  });
});
