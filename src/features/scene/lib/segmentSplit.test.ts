import { describe, expect, it } from "vitest";
import { moveSecondsForHold, splitSegment } from "./segmentSplit";

/**
 * 区間を【キープ】と【移動】に割る。
 *
 * ■ 余りは移動の【前】
 * そうすると**全員が次のシーンの時刻ちょうどに着く**。踊りは拍で隊形を
 * 決めるので、着地の瞬間が揃っているのが正しい。
 */
describe("splitSegment", () => {
  it("移動時間を決めていなければ、区間まるごとを使う（今までどおり）", () => {
    expect(splitSegment(4, null)).toEqual({ holdSeconds: 0, moveSeconds: 4 });
  });

  it("移動時間を短くすると、余りが前のキープになる", () => {
    expect(splitSegment(4, 1)).toEqual({ holdSeconds: 3, moveSeconds: 1 });
  });

  it("区間ちょうどを指定したら、キープは0", () => {
    expect(splitSegment(4, 4)).toEqual({ holdSeconds: 0, moveSeconds: 4 });
  });

  it("区間より長い移動時間は、区間で頭打ちにする", () => {
    // 次のシーンの時刻を追い越して動くことはできない
    expect(splitSegment(4, 10)).toEqual({ holdSeconds: 0, moveSeconds: 4 });
  });

  it("0秒はそのまま通す（一瞬で移動＝テレポート）", () => {
    // 「一瞬で決めたい」は振付として有り。速すぎる警告が別に知らせる
    expect(splitSegment(4, 0)).toEqual({ holdSeconds: 4, moveSeconds: 0 });
  });

  it("負の値は0として扱う", () => {
    expect(splitSegment(4, -2)).toEqual({ holdSeconds: 4, moveSeconds: 0 });
  });

  it("区間が0なら、キープも移動も0", () => {
    // 最初のシーン（前に区間が無い）がこれ
    expect(splitSegment(0, null)).toEqual({ holdSeconds: 0, moveSeconds: 0 });
    expect(splitSegment(0, 2)).toEqual({ holdSeconds: 0, moveSeconds: 0 });
  });

  it("区間が負でも、負を返さない", () => {
    // 並びが壊れている作品でも、時間として意味のない値を外へ出さない
    expect(splitSegment(-3, null)).toEqual({ holdSeconds: 0, moveSeconds: 0 });
  });

  it("刻みの誤差を持ち込まない", () => {
    // 0.1 + 0.2 = 0.30000000000000004 の類。入力の刻みは 0.1
    const { holdSeconds, moveSeconds } = splitSegment(0.3, 0.1);
    expect(moveSeconds).toBe(0.1);
    expect(holdSeconds).toBe(0.2);
  });
});

/**
 * キープの欄に打たれた秒数を、**保存する側（移動）**へ直す。
 *
 * 欄は2つ出しているが、保存しているのは移動の1つだけ。
 * ここが `splitSegment` と**答えが分かれる向き**（打った数がそのまま
 * 保存されない）なので、割る側のテストでは守れない。
 */
describe("moveSecondsForHold", () => {
  it("打ったキープの分だけ、移動を短くする", () => {
    expect(moveSecondsForHold(4, 3)).toBe(1);
  });

  it("キープ0なら、区間まるごとを移動に使う", () => {
    expect(moveSecondsForHold(4, 0)).toBe(4);
  });

  it("キープが区間ちょうどなら、移動は0（一瞬で移る）", () => {
    expect(moveSecondsForHold(4, 4)).toBe(0);
  });

  it("区間より長いキープは、区間で頭打ちにする（移動は負にしない）", () => {
    expect(moveSecondsForHold(4, 10)).toBe(0);
  });

  it("負のキープは0として扱う", () => {
    expect(moveSecondsForHold(4, -2)).toBe(4);
  });

  it("null は「決めていない」。区間まるごとへ戻す", () => {
    expect(moveSecondsForHold(4, null)).toBeNull();
  });

  it("刻みの誤差を持ち込まない（素の引き算だと DB へ 2.1999… が入る）", () => {
    expect(moveSecondsForHold(3.3, 1.1)).toBe(2.2);
  });

  it("区間が負でも、負を返さない", () => {
    expect(moveSecondsForHold(-4, 1)).toBe(0);
  });

  it("打ち直すと元へ戻る（splitSegment と往復して同じ数になる）", () => {
    const move = moveSecondsForHold(4, 2.5);
    expect(splitSegment(4, move).holdSeconds).toBe(2.5);
  });
});
