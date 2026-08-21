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
 *      作品には曲が入っていない**ので、そこは【順番だけ】の帯になる。
 *      つまり**初回に必ず食い違う案内**だった
 *   2. ステージの説明が「上がバックステージ」と向きを言い切っていた。
 *      「客席を上にする」で上下は入れ替わる
 */
describe("tourSteps", () => {
  it("指す先は4つとも data-tour。クラス名を目印にしない", () => {
    expect(tourSteps(ja, false).map((step) => step.target)).toEqual([
      '[data-tour="stage"]',
      '[data-tour="timeline"]',
      '[data-tour="add-scene"]',
      '[data-tour="display-menu"]',
    ]);
  });

  it("順番だけのときは、帯の説明で時刻の話をしない", () => {
    const [, timeline, add] = tourSteps(ja, true);

    expect(String(timeline.title)).toContain("順番");
    expect(String(timeline.content)).not.toContain("何秒目");
    // 「いま聞いている位置」は、曲が無いと存在しない
    expect(String(add.content)).not.toContain("聞いている");
  });

  it("曲やメトロノームがあるときは、時刻の話に戻る", () => {
    const [, timeline, add] = tourSteps(ja, false);

    expect(String(timeline.title)).toContain("時間");
    expect(String(timeline.content)).toContain("何秒目");
    expect(String(add.content)).toContain("聞いている");
  });

  it("ステージの説明は、上下の向きを言い切らない（客席を上にすると入れ替わる）", () => {
    const stage = String(tourSteps(ja, true)[0].content);

    expect(stage).not.toContain("上がバックステージ");
    expect(stage).not.toContain("下が客席");
  });
});
