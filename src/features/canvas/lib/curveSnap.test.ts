import { describe, expect, it } from "vitest";
import { snapCurveControlPoint } from "@/features/canvas/lib/curveSnap";

/** 横一直線の導線。中点は (5, 4)、直交する向きは縦 */
const FROM = { x: 2, y: 4 };
const TO = { x: 8, y: 4 };
const TOLERANCE = 0.35;

function snap(point: { x: number; y: number }) {
  return snapCurveControlPoint({
    point,
    from: FROM,
    to: TO,
    tolerance: TOLERANCE,
  });
}

describe("snapCurveControlPoint", () => {
  it("中点の近くなら、ぴったり中点へ寄せる（＝まっすぐ）", () => {
    const result = snap({ x: 5.2, y: 4.1 });

    expect(result.kind).toBe("straight");
    expect(result.point).toEqual({ x: 5, y: 4 });
  });

  it("直交する線の近くなら、膨らみを保ったまま傾きだけ正す", () => {
    // 中点の真上あたり。x が少しずれている
    const result = snap({ x: 5.2, y: 1 });

    expect(result.kind).toBe("symmetric");
    expect(result.point.x).toBeCloseTo(5);
    expect(result.point.y).toBeCloseTo(1);
  });

  it("どちらからも遠ければ、指の位置のまま", () => {
    const result = snap({ x: 7, y: 1 });

    expect(result.kind).toBeNull();
    expect(result.point).toEqual({ x: 7, y: 1 });
  });

  /* 中点の近くは直交する線の上でもある。まっすぐを先に見ないと、
     「まっすぐにしたいのにわずかに膨らんだまま止まる」ことになる */
  it("中点のすぐ上は、対称ではなくまっすぐを選ぶ", () => {
    const result = snap({ x: 5, y: 4.2 });

    expect(result.kind).toBe("straight");
  });

  it("斜めの導線でも、直交する向きで正す", () => {
    // (0,0)→(4,4) の中点は (2,2)。そこから左上へ出た所を、少しずらして掴む
    const result = snapCurveControlPoint({
      point: { x: 1.1, y: 3.0 },
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 },
      tolerance: TOLERANCE,
    });

    expect(result.kind).toBe("symmetric");
    // 寄せた先は、中点から線に直交する向きへ出ている
    // （中点からのベクトルと、線の向きの内積が0）
    const alongLine =
      (result.point.x - 2) * (4 - 0) + (result.point.y - 2) * (4 - 0);
    expect(alongLine).toBeCloseTo(0);
  });

  it("始点と終点が同じなら、何もしない（線が引けない）", () => {
    const result = snapCurveControlPoint({
      point: { x: 3, y: 3 },
      from: { x: 1, y: 1 },
      to: { x: 1, y: 1 },
      tolerance: TOLERANCE,
    });

    expect(result.kind).toBeNull();
    expect(result.point).toEqual({ x: 3, y: 3 });
  });

  /* ここが実機の報告 17-13。**つまみが真ん中でなくても**、線の上まで
     持っていけばまっすぐになる。以前は中点の近くだけを見ていた */
  it("線の上なら、真ん中から離れていてもまっすぐへ寄せる", () => {
    // 終点寄り（x=7.5）だが、線（y=4）の上に居る
    const result = snap({ x: 7.5, y: 4.2 });

    expect(result.kind).toBe("straight");
    expect(result.point).toEqual({ x: 5, y: 4 });
  });

  it("線から離れていれば、真ん中の真横でも寄せない", () => {
    const result = snap({ x: 5.1, y: 4 + TOLERANCE + 0.01 });

    expect(result.kind).not.toBe("straight");
  });

  /* 2点の外側まで広げると、遠くを掴んでいるのに中点まで飛ぶ */
  it("2点の外側は、線の延長上でも寄せない", () => {
    const result = snap({ x: 9.5, y: 4 });

    expect(result.kind).toBeNull();
    expect(result.point).toEqual({ x: 9.5, y: 4 });
  });

  it("しきい値ちょうどは寄せる（境目を落とさない）", () => {
    const result = snap({ x: 5, y: 4 + TOLERANCE });

    expect(result.kind).toBe("straight");
  });
});
