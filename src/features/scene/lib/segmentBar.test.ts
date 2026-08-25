import { describe, expect, it } from "vitest";
import {
  holdRatio,
  moveSecondsAfterNudge,
  moveSecondsAtRatio,
} from "./segmentBar";

/* 4秒の区間・1拍 = 0.5秒（BPM 120）で見る */
const SPAN = 4;
const BEAT = 0.5;

describe("バーの位置から移動時間を出す", () => {
  it("いちばん左は、まったく待たない（区間まるごと動く）", () => {
    expect(moveSecondsAtRatio(SPAN, 0, BEAT)).toBe(4);
  });

  it("いちばん右は、ぎりぎりまで待つ（移動は0＝一瞬で動く）", () => {
    expect(moveSecondsAtRatio(SPAN, 1, BEAT)).toBe(0);
  });

  it("真ん中は、半分待って半分で動く", () => {
    expect(moveSecondsAtRatio(SPAN, 0.5, BEAT)).toBe(2);
  });

  it("拍の間を指しても、近い拍へ寄る", () => {
    // 0.3 * 4 = 1.2秒 → 近い拍は 1.0秒 → 移動は 3.0秒
    expect(moveSecondsAtRatio(SPAN, 0.3, BEAT)).toBe(3);
  });

  it("枠の外を指しても、区間からはみ出さない", () => {
    expect(moveSecondsAtRatio(SPAN, -2, BEAT)).toBe(4);
    expect(moveSecondsAtRatio(SPAN, 5, BEAT)).toBe(0);
  });

  it("区間が0なら、割りようが無いので0", () => {
    expect(moveSecondsAtRatio(0, 0.5, BEAT)).toBe(0);
    expect(moveSecondsAtRatio(-3, 0.5, BEAT)).toBe(0);
  });

  it("刻みを渡さなければ、寄せずにそのまま割る", () => {
    expect(moveSecondsAtRatio(SPAN, 0.3, 0)).toBe(2.8);
  });

  /* 拍の途中で終わる区間。**待ちきる指定ができなければならない** */
  it("1拍より短い端数が残る区間でも、右端まで待ちきれる", () => {
    // 3.2秒の区間を 0.5秒の拍で割ると、6拍(3.0秒)で 0.2秒余る
    expect(moveSecondsAtRatio(3.2, 1, BEAT)).toBe(0);
  });

  it("最後の拍より右は、区間の端へ寄せる（端数を残さない）", () => {
    // 0.97 * 3.2 = 3.104秒 → 近い拍は 3.0 だが、そこは端へ寄せる
    expect(moveSecondsAtRatio(3.2, 0.97, BEAT)).toBe(0);
  });

  it("刻みが区間より長くても、両端は指せる", () => {
    expect(moveSecondsAtRatio(1, 0, 4)).toBe(1);
    expect(moveSecondsAtRatio(1, 1, 4)).toBe(0);
  });
});

describe("いまの割り方を、バーの位置で返す", () => {
  it("待っていなければ左端", () => {
    expect(holdRatio(SPAN, 0)).toBe(0);
  });

  it("半分待っていれば真ん中", () => {
    expect(holdRatio(SPAN, 2)).toBe(0.5);
  });

  it("区間より長く待つ値が来ても、右端で止める", () => {
    expect(holdRatio(SPAN, 99)).toBe(1);
    expect(holdRatio(SPAN, -1)).toBe(0);
  });

  it("区間が0なら左端", () => {
    expect(holdRatio(0, 3)).toBe(0);
  });
});

describe("キーボードで1刻みずつ動かす", () => {
  it("右は滞在が増え、移動が1拍ぶん減る", () => {
    expect(moveSecondsAfterNudge(SPAN, 1, 1, BEAT)).toBe(2.5);
  });

  it("左は滞在が減り、移動が1拍ぶん増える", () => {
    expect(moveSecondsAfterNudge(SPAN, 1, -1, BEAT)).toBe(3.5);
  });

  it("端を越えない", () => {
    expect(moveSecondsAfterNudge(SPAN, 0, -1, BEAT)).toBe(4);
    expect(moveSecondsAfterNudge(SPAN, SPAN, 1, BEAT)).toBe(0);
  });

  it("誤差を持ち越さない", () => {
    // 3.3 - 1.1 を素で引くと 2.1999999999999997 になる
    expect(moveSecondsAfterNudge(3.3, 0, 1, 1.1)).toBe(2.2);
  });
});
