import { describe, expect, it } from "vitest";
import { isTap, startedOnSceneCard, TAP_SLOP_PX } from "./bandTapTarget";

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

describe("isTap（押しただけか、引いたか）", () => {
  it("まったく動かさなければ、押しただけ", () => {
    expect(isTap(0)).toBe(true);
  });

  /** ここが肝心。**指は必ず少し動く**ので、1〜2px は押したうちに入る */
  it("指のぶれ（数px）は、押しただけに入れる", () => {
    expect(isTap(1)).toBe(true);
    expect(isTap(2)).toBe(true);
  });

  /* 境目をまたぐ両側で書く。片側だけだと、比較を <= に変えても緑のまま */
  it("境目の手前は押しただけ、境目そのものからは引いた", () => {
    expect(isTap(TAP_SLOP_PX - 1)).toBe(true);
    expect(isTap(TAP_SLOP_PX)).toBe(false);
  });

  /** 左へ引いても同じ。符号で答えが変わってはいけない */
  it("左へ引いても、右と同じ所で分かれる", () => {
    expect(isTap(-(TAP_SLOP_PX - 1))).toBe(true);
    expect(isTap(-TAP_SLOP_PX)).toBe(false);
  });

  it("大きく引いたら、当然引いたうち", () => {
    expect(isTap(200)).toBe(false);
    expect(isTap(-200)).toBe(false);
  });
});
