import { buildShareLink, isShareToken } from "./shareLink";

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("buildShareLink", () => {
  it("作品のidとトークンを含む", () => {
    expect(
      buildShareLink({
        origin: "https://choreon.example",
        projectId: "project-1",
        shareToken: TOKEN,
      }),
    ).toBe(`https://choreon.example/view/project-1?t=${TOKEN}`);
  });

  it("ダンサーを指定すると、開いた時点でその人が選ばれる", () => {
    expect(
      buildShareLink({
        origin: "https://choreon.example",
        projectId: "project-1",
        shareToken: TOKEN,
        dancerId: "dancer-9",
      }),
    ).toBe(`https://choreon.example/view/project-1?t=${TOKEN}&p=dancer-9`);
  });

  // 二重スラッシュのURLは壊れて見え、貼る側が不安になる
  it("入口の末尾にスラッシュが付いていても二重にならない", () => {
    expect(
      buildShareLink({
        origin: "https://choreon.example/",
        projectId: "project-1",
        shareToken: TOKEN,
      }),
    ).toBe(`https://choreon.example/view/project-1?t=${TOKEN}`);
  });

  it("ダンサーの指定が null なら p を付けない", () => {
    const link = buildShareLink({
      origin: "https://choreon.example",
      projectId: "project-1",
      shareToken: TOKEN,
      dancerId: null,
    });

    expect(link).not.toContain("p=");
  });
});

/**
 * uuid でない文字列をそのまま関数へ渡すと、Postgres 側の型変換で
 * 例外になる。問い合わせる前に落とす
 */
describe("isShareToken", () => {
  it("uuidの形だけを通す", () => {
    expect(isShareToken(TOKEN)).toBe(true);
    expect(isShareToken(TOKEN.toUpperCase())).toBe(true);
  });

  it("uuidでないものは弾く", () => {
    expect(isShareToken("")).toBe(false);
    expect(isShareToken("abc")).toBe(false);
    expect(isShareToken("3f2504e0-4f89-41d3-9a0c")).toBe(false);
    expect(isShareToken("'; drop table projects; --")).toBe(false);
    expect(isShareToken(null)).toBe(false);
    expect(isShareToken(42)).toBe(false);
  });
});
