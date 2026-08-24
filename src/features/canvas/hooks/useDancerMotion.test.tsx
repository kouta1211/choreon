import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDancerMotion } from "./useDancerMotion";

/**
 * 離した瞬間、**一緒に動いた人**がどこに居るか。
 *
 * 実機の報告（2026-08-22）:「複数選択して移動させたあとに、一人だけ
 * ダンサーを移動させたりするとついてこなかった」。
 *
 * 掴んだ本人には「掴み終わった」印（isDragging が true → false）があり、
 * そこで確定値へ**飛ぶ**。追随していた人にはその印が無いので、
 * 移動時間をかけて**滑って**いた。配っていた移動量は離した瞬間に 0 へ
 * 戻るので、見た目は【いったん元の場所へ戻ってから、ゆっくり動く】。
 * 移動時間が4秒の作品なら4秒かかる。
 */

const BASE = {
  leftPercent: 25,
  topPercent: 25,
  controlLeftPercent: null,
  controlTopPercent: null,
  isDragging: false,
  isFollowingGroup: false,
  transitionDurationSeconds: 4,
  holdSeconds: 0,
  dimmedOpacity: 1,
};

/** 派生した MotionValue は1拍おいて追いつくので、1フレーム進めてから読む */
async function nextFrame() {
  await act(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

describe("useDancerMotion の、掴み終わり", () => {
  it("掴んでいた本人は、離した時点で確定値へ飛ぶ", async () => {
    const { result, rerender } = renderHook((props) => useDancerMotion(props), {
      initialProps: { ...BASE, isDragging: true },
    });

    rerender({ ...BASE, isDragging: false, leftPercent: 31.25 });
    await nextFrame();

    expect(result.current.left.get()).toBe("31.25%");
  });

  /* ここが報告の場面 */
  it("一緒に動いていた人も、離した時点で確定値へ飛ぶ", async () => {
    const { result, rerender } = renderHook((props) => useDancerMotion(props), {
      initialProps: { ...BASE, isFollowingGroup: true },
    });

    rerender({ ...BASE, isFollowingGroup: false, leftPercent: 31.25 });
    await nextFrame();

    expect(result.current.left.get()).toBe("31.25%");
  });

  /* シーンを切り替えたときは、今までどおり時間をかけて動く。
     ここまで飛ばすと、隊形が入れ替わる様子が見えなくなる */
  it("シーンの切り替えは、今までどおり滑って動く", async () => {
    const { result, rerender } = renderHook((props) => useDancerMotion(props), {
      initialProps: BASE,
    });

    rerender({ ...BASE, leftPercent: 31.25 });
    await nextFrame();

    // 4秒かけて動くので、1フレームでは着いていない
    expect(result.current.left.get()).not.toBe("31.25%");
  });
});

/**
 * **キープしてから動く。**
 *
 * user の指摘（2026-08-24）:「ある程度そのフォーメーションに滞在して、
 * 一瞬で移動する場合もあると思います」。
 *
 * 区間のうち移動に使わない余りは**移動の前**に置く。そうすると
 * **全員が次のシーンの時刻ちょうどに着く** — 踊りは拍で隊形を決めるので、
 * 着地の瞬間が揃っているのが正しい。
 */
describe("動き出すまでのキープ", () => {
  it("キープの間は、まだ元の場所に居る", async () => {
    const { result, rerender } = renderHook((props) => useDancerMotion(props), {
      initialProps: { ...BASE, holdSeconds: 5, transitionDurationSeconds: 1 },
    });

    rerender({
      ...BASE,
      holdSeconds: 5,
      transitionDurationSeconds: 1,
      leftPercent: 75,
    });
    await nextFrame();

    // 5秒待つはずなので、1フレームでは1ミリも動いていない
    expect(result.current.left.get()).toBe("25%");
  });

  it("キープが無ければ、その場から動き出す", async () => {
    const { result, rerender } = renderHook((props) => useDancerMotion(props), {
      initialProps: { ...BASE, holdSeconds: 0, transitionDurationSeconds: 1 },
    });

    rerender({
      ...BASE,
      holdSeconds: 0,
      transitionDurationSeconds: 1,
      leftPercent: 75,
    });
    await nextFrame();

    // 動き始めているので、もう始点ではない
    expect(result.current.left.get()).not.toBe("25%");
  });
});
