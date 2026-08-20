import { describe, expect, it } from "vitest";
import { buildShareLink, parseShareLink } from "./shareLink";
import { isShareToken } from "@/features/viewer/api/sharedProject";

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

/**
 * 狭い幅の案内から、配られたリンクを貼って見る側へ行くための読み取り。
 * **貼られる文字列は人が運んでくる**ので、前後に文が付く・改行が混ざる・
 * パスだけ、のどれも来る。
 */
describe("parseShareLink", () => {
  it("完全なURLから、作品と合鍵を取り出す", () => {
    expect(parseShareLink(`https://choreon.vercel.app/view/p1?t=${TOKEN}`))
      .toEqual({ projectId: "p1", shareToken: TOKEN, dancerId: null });
  });

  /* 本番のリンクを手元(localhost)で試す、という使い方が実際にある。
     開けるかどうかを決めるのは開いた先なので、出どころは見ない */
  it("出どころ(ホスト)は問わない", () => {
    expect(parseShareLink(`http://localhost:3000/view/p1?t=${TOKEN}`)?.projectId)
      .toBe("p1");
  });

  it("パスだけでも読む", () => {
    expect(parseShareLink(`/view/p1?t=${TOKEN}`)?.shareToken).toBe(TOKEN);
  });

  it("ポジション指定(p)も一緒に持ってくる", () => {
    expect(parseShareLink(`/view/p1?t=${TOKEN}&p=dancer-3`)?.dancerId).toBe(
      "dancer-3",
    );
  });

  /* LINE から貼ると、たいてい前後に文が付いてくる */
  it("文に混ざっていても拾う", () => {
    expect(
      parseShareLink(
        `これ見て https://choreon.vercel.app/view/p1?t=${TOKEN} よろしく`,
      )?.projectId,
    ).toBe("p1");
  });

  it("改行や全角の空白で区切られていても拾う", () => {
    expect(parseShareLink(`振付です　/view/p1?t=${TOKEN}
確認して`)?.projectId)
      .toBe("p1");
  });

  it("末尾のスラッシュを許す", () => {
    expect(parseShareLink(`/view/p1/?t=${TOKEN}`)?.projectId).toBe("p1");
  });

  /* 合鍵の無いリンクもある(自分の作品を自分で開くとき)。
     ここで弾くと、開けるはずのものが開けなくなる */
  it("合鍵が無くても、作品は読み取る", () => {
    expect(parseShareLink("/view/p1")).toEqual({
      projectId: "p1",
      shareToken: null,
      dancerId: null,
    });
  });

  it.each([
    ["空", ""],
    ["空白だけ", "   "],
    ["別の画面", `https://choreon.vercel.app/projects/p1`],
    ["作品が無い", "/view/"],
    ["ただの文", "こんにちは"],
    ["入れ子が深い", "/view/p1/extra"],
  ])("読めないものは null（%s）", (_label, input) => {
    expect(parseShareLink(input)).toBeNull();
  });
});
