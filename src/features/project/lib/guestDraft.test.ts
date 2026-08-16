import { beforeEach, describe, expect, it } from "vitest";

import {
  forgetGuestDraft,
  loadGuestDraft,
  saveGuestDraft,
} from "./guestDraft";
import { createGuestProject } from "./guestProject";

/**
 * ログインせずに作った下書きを、ブラウザに残す。
 *
 * ■ なぜテストするのか
 * 壊れても**その場では何も起きない**。次に開いたときに、組んだ隊形が
 * 種のサンプルへ戻っているという形でしか出ない。しかもそのときには
 * 手元にもう何も残っていない。
 */
const seed = createGuestProject({
  title: "はじめてのフォーメーション",
  sceneName: (index: number) => `シーン${index}`,
});

const DRAFT = {
  project: { ...seed.project, title: "春の発表会", stageWidth: 12 },
  dancers: seed.dancers,
  scenes: seed.scenes,
  positions: seed.positions.map((position, index) =>
    index === 0 ? { ...position, xCoordinate: 3.5 } : position,
  ),
};

describe("下書きをブラウザに残す", () => {
  beforeEach(() => {
    forgetGuestDraft();
  });

  it("残していなければ null", () => {
    expect(loadGuestDraft()).toBeNull();
  });

  it("書いたものが、そのまま戻る", () => {
    saveGuestDraft(DRAFT);

    const back = loadGuestDraft();
    expect(back?.project.title).toBe("春の発表会");
    expect(back?.project.stageWidth).toBe(12);
    expect(back?.scenes).toHaveLength(DRAFT.scenes.length);
    expect(back?.dancers).toHaveLength(DRAFT.dancers.length);
    // 立ち位置は座標まで戻る（ここが抜けると、隊形だけが失われる）
    expect(back?.positions[0].xCoordinate).toBe(3.5);
  });

  it("下書きの決まった値は、読むときに付け直す", () => {
    saveGuestDraft(DRAFT);

    const back = loadGuestDraft();
    // 持ち主も共有も、下書きには無い
    expect(back?.project.userId).toBe("guest");
    expect(back?.project.shareToken).toBeNull();
    expect(back?.project.isShared).toBe(false);
    // 子は全部この作品にぶら下がる
    const id = back!.project.id;
    expect(back?.dancers.every((dancer) => dancer.projectId === id)).toBe(true);
    expect(back?.scenes.every((scene) => scene.projectId === id)).toBe(true);
  });

  it("壊れていたら捨てて null（毎回同じ所で転ばせない）", () => {
    localStorage.setItem("choreon.draft.v1", "{ これは JSON ではない");

    expect(loadGuestDraft()).toBeNull();
    expect(localStorage.getItem("choreon.draft.v1")).toBeNull();
  });

  it("形が違うものも捨てる", () => {
    localStorage.setItem("choreon.draft.v1", JSON.stringify({ version: 1 }));

    expect(loadGuestDraft()).toBeNull();
  });

  it("忘れさせると、次からは null", () => {
    saveGuestDraft(DRAFT);

    forgetGuestDraft();

    expect(loadGuestDraft()).toBeNull();
  });
});
