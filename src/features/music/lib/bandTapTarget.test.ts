import { describe, expect, it } from "vitest";
import { startedOnSceneCard } from "./bandTapTarget";

/** コマの中に子を置いて、押した所がその奥でも見つけられるか見る */
function build(): { card: HTMLElement; inner: HTMLElement; band: HTMLElement } {
  const band = document.createElement("div");
  const card = document.createElement("button");
  card.setAttribute("data-scene-id", "scene-1");
  const inner = document.createElement("img");
  card.append(inner);
  band.append(card);
  return { card, inner, band };
}

describe("startedOnSceneCard", () => {
  it("コマそのものを押したら true", () => {
    expect(startedOnSceneCard(build().card)).toBe(true);
  });

  it("コマの中のミニチュアを押しても true（奥まで辿る）", () => {
    expect(startedOnSceneCard(build().inner)).toBe(true);
  });

  it("コマの外（帯の地）を押したら false", () => {
    expect(startedOnSceneCard(build().band)).toBe(false);
  });

  it("押した相手が居なくても落ちない", () => {
    expect(startedOnSceneCard(null)).toBe(false);
  });

  it("要素でないものを渡されても落ちない", () => {
    expect(startedOnSceneCard(new EventTarget())).toBe(false);
  });
});
