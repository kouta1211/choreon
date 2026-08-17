import { describe, expect, it } from "vitest";
import { needsConfirm, parseAssistResponse } from "./actions";

/**
 * 言葉で頼まれたことを、操作1つに落とすところ。
 *
 * ここで守っているのは1本 ——
 * **引数は、渡した選択肢の中からしか通さない。**
 * 無いシーン番号や組めない隊形を通すと、押しても何も起きない。
 * 頼んだ人からは「壊れている」と区別が付かないので、`none` に落として
 * 言葉で返す方が正しい。
 *
 * 座標や秒数は、そもそも AI から受け取っていない（アプリが計算する）。
 */
const LIMITS = { sceneCount: 5, dancerCount: 8 };
const FALLBACK = "読み取れませんでした";

const raw = (object: unknown) => JSON.stringify(object);

describe("parseAssistResponse", () => {
  it("床の線を変える", () => {
    const result = parseAssistResponse(
      raw({ kind: "setGrid", grid: "circle", reply: "" }),
      LIMITS,
      FALLBACK,
    );

    expect(result.action).toEqual({ kind: "setGrid", grid: "circle" });
  });

  it("知らない床の線は落とす", () => {
    const result = parseAssistResponse(
      raw({ kind: "setGrid", grid: "hexagon", reply: "" }),
      LIMITS,
      FALLBACK,
    );

    expect(result.action.kind).toBe("none");
  });

  it("表示の切り替えは、出す/消すを受け取る", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "setToggle", toggleTarget: "marks", on: false, reply: "" }),
        LIMITS,
        FALLBACK,
      ).action,
    ).toEqual({ kind: "setToggle", target: "marks", on: false });
  });

  /** on が抜けたら「出して」と読む。消すのは言葉で言ってもらう */
  it("on が無ければ、出す側に読む", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "setToggle", toggleTarget: "paths", reply: "" }),
        LIMITS,
        FALLBACK,
      ).action,
    ).toEqual({ kind: "setToggle", target: "paths", on: true });
  });

  it("シーンは、いまある番号だけ", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "selectScene", sceneNumber: 3, reply: "" }),
        LIMITS,
        FALLBACK,
      ).action,
    ).toEqual({ kind: "selectScene", sceneNumber: 3 });
  });

  /** ★ここが本題。無い番号を開こうとしても何も起きない */
  it("無いシーン番号は落とす", () => {
    for (const sceneNumber of [0, 6, 99, -1, 2.5]) {
      expect(
        parseAssistResponse(
          raw({ kind: "selectScene", sceneNumber, reply: "" }),
          LIMITS,
          FALLBACK,
        ).action.kind,
      ).toBe("none");
    }
  });

  it("隊形は、いまの人数で組める形だけ", () => {
    // 8人なら横1列は組める
    expect(
      parseAssistResponse(
        raw({ kind: "applyFormation", shape: "row", reply: "" }),
        LIMITS,
        FALLBACK,
      ).action,
    ).toEqual({ kind: "applyFormation", shape: "row" });
  });

  it("知らない形は落とす", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "applyFormation", shape: "spiral", reply: "" }),
        LIMITS,
        FALLBACK,
      ).action.kind,
    ).toBe("none");
  });

  /** 1人では隊形が組めない。人数に合う形が無ければ落とす */
  it("その人数で組めない形は落とす", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "applyFormation", shape: "row", reply: "" }),
        { sceneCount: 5, dancerCount: 0 },
        FALLBACK,
      ).action.kind,
    ).toBe("none");
  });

  it("できないことは、言葉だけ返す", () => {
    const result = parseAssistResponse(
      raw({ kind: "none", reply: "ダンサーの色は変えられません" }),
      LIMITS,
      FALLBACK,
    );

    expect(result.action.kind).toBe("none");
    expect(result.reply).toBe("ダンサーの色は変えられません");
  });

  /** 操作が決まったときの説明はアプリが書く。AI の言葉は使わない */
  it("操作が決まったら、AI の言葉は捨てる", () => {
    const result = parseAssistResponse(
      raw({
        kind: "setToggle",
        toggleTarget: "marks",
        on: true,
        reply: "バミリを3マスずらして出しました",
      }),
      LIMITS,
      FALLBACK,
    );

    expect(result.action.kind).toBe("setToggle");
    // 「3マスずらして」のような、当たっていない説明を出さない
    expect(result.reply).toBe("");
  });

  it("知らない kind は落とす", () => {
    expect(
      parseAssistResponse(
        raw({ kind: "deleteEverything", reply: "" }),
        LIMITS,
        FALLBACK,
      ).action.kind,
    ).toBe("none");
  });

  it("JSON として読めなければ、断りの言葉を返す", () => {
    const result = parseAssistResponse("わかりました！", LIMITS, FALLBACK);

    expect(result.action.kind).toBe("none");
    expect(result.reply).toBe(FALLBACK);
  });
});

describe("needsConfirm", () => {
  /** 作品を書き換えるものだけ確認する */
  it("書き換えるものは確認する", () => {
    expect(needsConfirm({ kind: "clearBlindSpots" })).toBe(true);
    expect(needsConfirm({ kind: "extendFastMoves" })).toBe(true);
    expect(needsConfirm({ kind: "applyFormation", shape: "row" })).toBe(true);
  });

  /** 1タップで戻せるものは、確認を挟むと頼む意味が無くなる */
  it("表示と「開く」は確認しない", () => {
    expect(needsConfirm({ kind: "setGrid", grid: "none" })).toBe(false);
    expect(
      needsConfirm({ kind: "setToggle", target: "marks", on: true }),
    ).toBe(false);
    expect(needsConfirm({ kind: "open", target: "music" })).toBe(false);
    expect(needsConfirm({ kind: "selectScene", sceneNumber: 2 })).toBe(false);
  });
});

/**
 * 素の文章に混ざった JSON も読む。
 *
 * 型を断られたときは型なしで呼び直す作りなので、``` で囲まれた JSON や
 * 前置きの付いた JSON が返ることがある。**正しい答えが入っているのに
 * 丸ごと捨てる**のは惜しい。
 */
describe("parseAssistResponse（素の文章に混ざっているとき）", () => {
  it("コードの囲みが付いていても読む", () => {
    const wrapped = '```json\n{"kind":"setToggle","toggleTarget":"marks","on":true,"reply":""}\n```';

    expect(parseAssistResponse(wrapped, LIMITS, FALLBACK).action).toEqual({
      kind: "setToggle",
      target: "marks",
      on: true,
    });
  });

  it("前置きが付いていても読む", () => {
    const chatty =
      'わかりました。次の操作をします:\n{"kind":"selectScene","sceneNumber":2,"reply":""}\nよろしいですか?';

    expect(parseAssistResponse(chatty, LIMITS, FALLBACK).action).toEqual({
      kind: "selectScene",
      sceneNumber: 2,
    });
  });

  /** 途中で切られた JSON は読めない。断りに落とす */
  it("途中で切れていれば、断りに落とす", () => {
    const cut = '{"kind":"setToggle","toggleTarget":"ma';

    expect(parseAssistResponse(cut, LIMITS, FALLBACK).action.kind).toBe("none");
  });
});
