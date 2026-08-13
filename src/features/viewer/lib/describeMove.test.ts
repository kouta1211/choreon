import { describe, expect, it } from "vitest";
import { describeMove } from "./describeMove";
import { moveText } from "@/features/i18n/lib/moveText";
import { ja } from "@/features/i18n/messages/ja";

const at = (x: number, y: number, angle = 0) => ({
  xCoordinate: x,
  yCoordinate: y,
  rotationAngle: angle,
});

/** 差分の読み取りと文の組み立ては別物になったが、
 * 「画面の左へ動いたら下手と読める」ことは通しで確かめたい */
const say = (
  from: Parameters<typeof describeMove>[0],
  to: Parameters<typeof describeMove>[1],
  seconds: number,
) => moveText(describeMove(from, to, seconds), ja);

describe("describeMove", () => {
  // 画面は真上から客席を下にして見ている。客席から舞台を見ると
  // 左右が入れ替わるので、画面左が下手になる
  it("画面の左へ動いたら下手", () => {
    expect(describeMove(at(6, 4), at(2, 4), 2).move?.sideways).toBe("left");
    expect(say(at(6, 4), at(2, 4), 2).text).toContain("下手");
  });

  it("画面の右へ動いたら上手", () => {
    expect(describeMove(at(2, 4), at(6, 4), 2).move?.sideways).toBe("right");
    expect(say(at(2, 4), at(6, 4), 2).text).toContain("上手");
  });

  it("客席側へ動いたら前", () => {
    expect(describeMove(at(4, 2), at(4, 6), 2).move?.depth).toBe("front");
    expect(say(at(4, 2), at(4, 6), 2).text).toContain("前");
  });

  it("バックステージ側へ動いたら奥", () => {
    expect(describeMove(at(4, 6), at(4, 2), 2).move?.depth).toBe("back");
    expect(say(at(4, 6), at(4, 2), 2).text).toContain("奥");
  });

  it("2軸とも動いていれば合成する", () => {
    expect(say(at(6, 2), at(2, 6), 3).text).toContain("下手前へ");
  });

  // 片方の軸がわずかしか動いていないのに「下手前」と言うと、
  // 実際には真横なのに斜めへ行こうとしてしまう
  it("わずかな軸は言葉にしない", () => {
    expect(describeMove(at(6, 4), at(2, 4.2), 2).move?.depth).toBeNull();
    expect(say(at(6, 4), at(2, 4.2), 2).text).toBe("下手へ 約6歩");
  });

  it("ほとんど動かないなら「その場」", () => {
    expect(describeMove(at(4, 4), at(4.2, 4.1), 2).move).toBeNull();
    expect(say(at(4, 4), at(4.2, 4.1), 2).text).toBe("その場");
  });

  // 1マス90cm、1歩60cm
  it("歩数はマス数から出す", () => {
    // 4マス = 3.6m ÷ 0.6m = 6歩
    expect(describeMove(at(0, 4), at(4, 4), 3).move?.steps).toBe(6);
    expect(say(at(0, 4), at(4, 4), 3).text).toBe("上手へ 約6歩");
  });

  it("わずかでも動くなら1歩は数える", () => {
    expect(say(at(0, 4), at(0.5, 4), 3).text).toBe("上手へ 約1歩");
  });

  describe("向き", () => {
    it("変わらなければ何も足さない", () => {
      expect(describeMove(at(0, 4, 90), at(4, 4, 90), 2).turnTo).toBeNull();
      expect(say(at(0, 4, 90), at(4, 4, 90), 2).turn).toBeNull();
    });

    it("変わったら向きの名前を足す", () => {
      expect(say(at(0, 4, 0), at(4, 4, 90), 2).turn).toBe("＋ 下手向き");
    });

    // 45度刻みに吸着しているので、そのまま言葉になる
    it("斜めも名前になる", () => {
      expect(say(at(0, 4, 0), at(0, 4, 315), 2).turn).toBe("＋ 上手前向き");
    });

    it("動かなくても向きだけは伝える", () => {
      const move = say(at(4, 4, 0), at(4, 4, 180), 2);
      expect(move.text).toBe("その場");
      expect(move.turn).toBe("＋ 奥向き");
    });
  });

  describe("速さ", () => {
    // エディタの警告と同じ判定(3.5m/s)を使う
    it("歩いて間に合う速さなら印を付けない", () => {
      expect(describeMove(at(0, 4), at(4, 4), 3).isFast).toBe(false);
    });

    it("走ることになる速さなら印を付ける", () => {
      expect(describeMove(at(0, 4), at(10, 4), 1).isFast).toBe(true);
    });
  });
});
