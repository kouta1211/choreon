import { describe, expect, it } from "vitest";
import { isOrderOnlyTimeline } from "@/features/scene/lib/timelineMode";

describe("isOrderOnlyTimeline", () => {
  it("曲もメトロノームも無ければ、順番だけにする", () => {
    expect(
      isOrderOnlyTimeline({ hasMusic: false, isMetronomeEnabled: false }),
    ).toBe(true);
  });

  /* ここが要。**曲を入れたままスイッチを切っている**作品で時刻を隠すと、
     曲に合わせて置いた隊形を曲に合わせて直せなくなる */
  it("曲が入っていれば、スイッチが切れていても時刻を出す", () => {
    expect(
      isOrderOnlyTimeline({ hasMusic: true, isMetronomeEnabled: false }),
    ).toBe(false);
  });

  it("曲が無くても、メトロノームが鳴るなら時刻を出す（拍という物差しがある）", () => {
    expect(
      isOrderOnlyTimeline({ hasMusic: false, isMetronomeEnabled: true }),
    ).toBe(false);
  });

  it("両方あれば当然、時刻を出す", () => {
    expect(
      isOrderOnlyTimeline({ hasMusic: true, isMetronomeEnabled: true }),
    ).toBe(false);
  });
});
