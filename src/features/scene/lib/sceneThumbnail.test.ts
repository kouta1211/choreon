import { describe, expect, it } from "vitest";
import { buildThumbnailDataUrl, buildThumbnailDots } from "./sceneThumbnail";
import { makeDancer, makePosition } from "@/test/factories";

/** テスト用の色の読み替え。実際の画面ではCSS変数を実測値に直す関数が入る */
const passThrough = (color: string) => color;

const DANCERS = {
  "dancer-1": makeDancer({ color: "#3b82f6" }),
  "dancer-2": makeDancer({ id: "dancer-2", color: "#ef4444" }),
};

describe("buildThumbnailDots", () => {
  it("ステージ座標を0〜1の割合に直す", () => {
    const dots = buildThumbnailDots(
      { "dancer-1": makePosition({ xCoordinate: 3, yCoordinate: 5 }) },
      DANCERS,
      15,
      10,
      passThrough,
    );

    expect(dots).toEqual([{ x: 0.2, y: 0.5, color: "#3b82f6" }]);
  });

  it("受け取った関数で色を読み替える(テーマごとの実測値を入れるため)", () => {
    const dots = buildThumbnailDots(
      { "dancer-1": makePosition() },
      DANCERS,
      15,
      10,
      () => "rgb(1, 2, 3)",
    );

    expect(dots[0].color).toBe("rgb(1, 2, 3)");
  });

  // ダンサーを消しても、そのダンサーの配置が残っている瞬間がありうる
  it("いないダンサーの配置は描かない", () => {
    const dots = buildThumbnailDots(
      { "dancer-9": makePosition({ dancerId: "dancer-9" }) },
      DANCERS,
      15,
      10,
      passThrough,
    );

    expect(dots).toEqual([]);
  });
});

describe("buildThumbnailDataUrl", () => {
  it("ステージの縦横比をviewBoxに反映する", () => {
    const url = buildThumbnailDataUrl([], 15, 10);

    expect(decodeURIComponent(url)).toContain('viewBox="0 0 100 66.67"');
  });

  it("点の数だけ円を描く", () => {
    const url = buildThumbnailDataUrl(
      [
        { x: 0, y: 0, color: "#3b82f6" },
        { x: 1, y: 1, color: "#ef4444" },
      ],
      10,
      10,
    );
    const svg = decodeURIComponent(url);

    expect(svg.match(/<circle/g)).toHaveLength(2);
    expect(svg).toContain('fill="#3b82f6"');
    expect(svg).toContain('cx="100" cy="100"');
  });

  // 色はSupabaseに保存されている値、つまり書き換えられる可能性のある
  // 外部入力。属性を抜け出せる文字を通すと、色の文字列にSVGを足せてしまう
  it("色に混ざった記号を落として、属性から抜け出せないようにする", () => {
    const url = buildThumbnailDataUrl(
      [{ x: 0, y: 0, color: '"/><script>alert(1)</script>' }],
      10,
      10,
    );

    expect(decodeURIComponent(url)).not.toContain("<script>");
  });
});
