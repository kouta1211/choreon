import { describe, expect, it } from "vitest";
import { tourSteps } from "./tourSteps";
import { ja } from "@/features/i18n/messages/ja";

/**
 * 案内が**実物とずれていないか**を縛る。
 *
 * ずれても画面は正しく動くので、人は気づけない。実際に2つずれていた
 * (2026-08-21):
 *
 *   1. 帯の説明が「曲の何秒目か」で固定されていた。**初めて開く人の
 *      作品には曲が入っていない**ので、そこは別の帯になっていた。
 *      つまり**初回に必ず食い違う案内**だった
 *   2. ステージの説明が「上がバックステージ」と向きを言い切っていた。
 *      「客席を上にする」で上下は入れ替わる
 *
 * 2026-08-26 に**どの作品でもカウントで組む**ようにしたので、
 * 1つ目の食い違いは条件ごと消えた。代わりに縛るのは
 * **秒の話が戻ってきていないか**。
 */
describe("tourSteps", () => {
  it("指す先は4つとも data-tour。クラス名を目印にしない", () => {
    expect(tourSteps(ja).map((step) => step.target)).toEqual([
      '[data-tour="stage"]',
      '[data-tour="timeline"]',
      '[data-tour="add-scene"]',
      '[data-tour="display-menu"]',
    ]);
  });

  it("帯の説明はカウントで言う（曲の秒数の話に戻さない）", () => {
    const [, timeline] = tourSteps(ja);

    expect(String(timeline.title)).toContain("カウント");
    expect(String(timeline.content)).toContain("カウント");
    expect(String(timeline.content)).not.toContain("何秒目");
  });

  /* **初めて開く人の作品に曲は入っていない。** 「いま聞いている位置に
     できます」と言い切ると、その人には必ず嘘になる */
  it("追加の説明は、曲が無くても成り立つ言い方にする", () => {
    const add = String(tourSteps(ja)[2].content);

    expect(add).toContain("選んでいるシーンの隣");
  });

  it("ステージの説明は、上下の向きを言い切らない（客席を上にすると入れ替わる）", () => {
    const stage = String(tourSteps(ja)[0].content);

    expect(stage).not.toContain("上がバックステージ");
    expect(stage).not.toContain("下が客席");
  });
});
