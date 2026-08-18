import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLastViewed,
  LAST_VIEWED_STORAGE_KEY,
  loadLastViewed,
  saveLastViewed,
} from "./lastViewed";

/**
 * 最後に見た共有リンク（2026-08-18、実機の報告 05-5）。
 *
 * ホーム画面のアイコンはトップページを開くので、圏外だと戻る道が無かった。
 * **localStorage は書き換えられる外部入力**なので、読むときの検証を厚く見る。
 */
describe("lastViewed", () => {
  beforeEach(() => localStorage.clear());

  it("覚えて、読み出せる", () => {
    saveLastViewed({ path: "/view/abc?t=xyz", title: "はじめての振付" });

    expect(loadLastViewed()).toEqual({
      path: "/view/abc?t=xyz",
      title: "はじめての振付",
    });
  });

  it("何も覚えていなければ null", () => {
    expect(loadLastViewed()).toBeNull();
  });

  it("消せる", () => {
    saveLastViewed({ path: "/view/abc?t=xyz", title: "あ" });
    clearLastViewed();

    expect(loadLastViewed()).toBeNull();
  });

  /** ここを緩めると、書き換えられた値でよそへ飛ばす入口になる */
  it.each([
    ["別のホストへ飛ばす形", '{"path":"//evil.example/x","title":"a"}'],
    ["よその画面", '{"path":"/projects/1","title":"a"}'],
    ["絶対URL", '{"path":"https://evil.example","title":"a"}'],
    ["題名が無い", '{"path":"/view/a"}'],
    ["文字列ではない", '{"path":123,"title":"a"}'],
    ["JSONですらない", "こわれた"],
  ])("受け付けない: %s", (_name, raw) => {
    localStorage.setItem(LAST_VIEWED_STORAGE_KEY, raw);

    expect(loadLastViewed()).toBeNull();
  });

  it("/view/ 以外は覚えない", () => {
    saveLastViewed({ path: "/projects/1", title: "a" });

    expect(loadLastViewed()).toBeNull();
  });
});
