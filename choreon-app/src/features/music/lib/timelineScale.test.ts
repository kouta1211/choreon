import {
  axisSecondsAt,
  axisX,
  defaultPxPerSecond,
  clampPxPerSecond,
  clampScrollX,
  contentWidth,
  degradeScenes,
  DEFAULT_PX_PER_SECOND,
  LEAD_IN_PX,
  MAX_PX_PER_SECOND,
  MIN_PX_PER_SECOND,
  PLAYHEAD_ANCHOR,
  scrollAfterZoom,
  scrollForSeconds,
  zoomForCluster,
} from "./timelineScale";
import { DEFAULT_SEGMENT_SECONDS } from "@/features/scene/lib/sceneTiming";
import { TIMELINE_LAYOUT } from "@/features/music/lib/timelineLayout";

describe("defaultPxPerSecond", () => {
  // 狙いは「窓に入る秒数を15〜18秒に揃える」こと。
  // 画面幅ではなく帯の実幅から決めるので、パネルに挟まれたPCでも
  // タブレットより引きすぎにならない
  it.each([
    ["スマホ", 362, 24, 15.1],
    ["タブレット", 627, 36, 17.4],
    ["PC(3ペインの中央)", 563, 36, 15.6],
  ])("%s の帯 %ipx なら %ipx/秒", (_name, width, expected) => {
    expect(defaultPxPerSecond(width)).toBe(expected);
  });

  it("どの段でも窓に入るのは15〜18秒に収まる", () => {
    for (const width of [362, 563, 627, 900, 1200]) {
      const seconds = width / defaultPxPerSecond(width);
      expect(seconds).toBeGreaterThanOrEqual(14);
      expect(seconds).toBeLessThanOrEqual(19);
    }
  });

  it("まだ測れていなければ既定に落とす", () => {
    expect(defaultPxPerSecond(0)).toBe(DEFAULT_PX_PER_SECOND);
    expect(defaultPxPerSecond(Number.NaN)).toBe(DEFAULT_PX_PER_SECOND);
  });
});

describe("clampPxPerSecond", () => {
  it("範囲の外は端で止める", () => {
    expect(clampPxPerSecond(1)).toBe(MIN_PX_PER_SECOND);
    expect(clampPxPerSecond(999)).toBe(MAX_PX_PER_SECOND);
  });

  it("数でない値は既定に落とす", () => {
    expect(clampPxPerSecond(Number.NaN)).toBe(DEFAULT_PX_PER_SECOND);
  });
});

describe("contentWidth", () => {
  it("先頭と末尾に余白を足す", () => {
    // 10秒 × 24px = 240px。頭に30px、末尾に窓半分(150px)
    expect(contentWidth(10, 24, 300)).toBe(LEAD_IN_PX + 390);
  });

  it("曲が短くても窓より狭くならない", () => {
    expect(contentWidth(1, 8, 300)).toBe(300);
  });
});

describe("clampScrollX", () => {
  it("左端より手前へは行かない", () => {
    expect(clampScrollX(-40, 900, 300)).toBe(0);
  });

  it("右端で止まる", () => {
    expect(clampScrollX(9999, 900, 300)).toBe(600);
  });

  it("軸が窓より短ければ動かない", () => {
    expect(clampScrollX(50, 200, 300)).toBe(0);
  });
});

describe("axisX / axisSecondsAt", () => {
  // 0秒は軸の原点ではなく、先頭の余白のぶんだけ右にある
  it("0秒は先頭の余白の位置に来る", () => {
    expect(axisX(0, 26)).toBe(LEAD_IN_PX);
  });

  it("秒とpxを往復しても値が変わらない", () => {
    expect(axisSecondsAt(axisX(12.5, 26), 26)).toBeCloseTo(12.5);
  });

  it("倍率が0なら0秒として扱う(0除算を避ける)", () => {
    expect(axisSecondsAt(100, 0)).toBe(0);
  });
});

describe("scrollForSeconds", () => {
  it("その時刻が定位置へ来る", () => {
    const scroll = scrollForSeconds(20, 24, 300, 5000);
    // 20秒 = 軸の 30+480px。窓の43%(129px)ぶん手前を左端にする
    expect(scroll).toBeCloseTo(LEAD_IN_PX + 480 - 300 * PLAYHEAD_ANCHOR);
  });

  it("曲の頭では左端に貼り付く(定位置まで下がれない)", () => {
    expect(scrollForSeconds(0, 24, 300, 5000)).toBe(0);
  });
});

describe("scrollAfterZoom", () => {
  it("指の下の時刻が動かない", () => {
    const before = scrollAfterZoom(240, 60, 24, 48);
    // 拡大の前後で、指の下(左端+60px)にある時刻が変わらない
    expect(axisSecondsAt(before + 60, 48)).toBeCloseTo(
      axisSecondsAt(240 + 60, 24),
    );
  });

  it("縮めても左端より手前へは行かない", () => {
    // 左端0で右寄りをつまんだまま引くと、計算上は負になる
    expect(scrollAfterZoom(0, 100, 24, 8)).toBe(0);
  });
});

describe("degradeScenes", () => {
  const at = (...times: number[]) => times;
  /** スマホのコマ(46px)＋4px */
  const PHONE_CARD_GAP = 50;

  it("十分に離れていれば全部コマ", () => {
    const items = degradeScenes(at(0, 3, 6), DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP);
    expect(items.map((item) => item.kind)).toEqual(["card", "card", "card"]);
  });

  it("先頭は左隣が無いので必ずコマ", () => {
    const items = degradeScenes(at(0, 0.2), DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP);
    expect(items[0].kind).toBe("cluster");
    // 先頭も束ねの中に数えられる(巻き込まれる側)
    expect(items[0].indexes).toEqual([0, 1]);
  });

  it("少し詰まると旗になる", () => {
    // 24px/秒 で 1.5秒 = 36px。26以上50未満
    const items = degradeScenes(at(0, 1.5), DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP);
    expect(items.map((item) => item.kind)).toEqual(["card", "flag"]);
  });

  // 何も設定していない作品でも、コマ(隊形の絵)のまま並ぶこと
  it("新しいシーンの既定の間隔(1つの8カウント)はコマのまま", () => {
    const items = degradeScenes(
      at(0, DEFAULT_SEGMENT_SECONDS, DEFAULT_SEGMENT_SECONDS * 2),
      DEFAULT_PX_PER_SECOND,
      PHONE_CARD_GAP,
    );
    expect(items.map((item) => item.kind)).toEqual(["card", "card", "card"]);
  });

  it("さらに詰まると束ねになり、数が積み上がる", () => {
    const items = degradeScenes(at(0, 5, 5.2, 5.4, 5.6), DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ kind: "card", indexes: [0], seconds: 0 });
    expect(items[1].kind).toBe("cluster");
    expect(items[1].indexes).toEqual([1, 2, 3, 4]);
    // 置き場所は含まれるシーンの中間
    expect(items[1].seconds).toBeCloseTo(5.3);
  });

  it("拡大すれば同じ配置がコマに戻る", () => {
    const times = at(0, 5, 5.2, 5.4, 5.6);
    const items = degradeScenes(times, MAX_PX_PER_SECOND, PHONE_CARD_GAP);
    // 0.2秒 × 120px = 24px … まだ束ね。0.5秒あれば 60px でコマ
    expect(items.some((item) => item.kind === "cluster")).toBe(true);
    expect(
      degradeScenes(at(0, 5, 5.5, 6), MAX_PX_PER_SECOND, PHONE_CARD_GAP).every(
        (item) => item.kind === "card",
      ),
    ).toBe(true);
  });

  it("境目ちょうどはコマ側に入る", () => {
    const seconds = PHONE_CARD_GAP / DEFAULT_PX_PER_SECOND;
    const items = degradeScenes(at(0, seconds), DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP);
    expect(items[1].kind).toBe("card");
  });

  it("シーンが無ければ空", () => {
    expect(degradeScenes([], DEFAULT_PX_PER_SECOND, PHONE_CARD_GAP)).toEqual([]);
  });
});

/**
 * 束ねを押したときの寄り先。「押しても何も起きない」を作らないための計算。
 */
describe("zoomForCluster", () => {
  const GAP_PX = 60;

  it("いちばん狭い間隔がコマの最小間隔になる倍率まで寄る", () => {
    // 0 / 1 / 1.5秒 の3つ。狭いのは0.5秒なので 60px / 0.5秒 = 120px/秒
    const zoom = zoomForCluster([0, 1, 1.5], [0, 1, 2], GAP_PX, 24);
    expect(zoom.pxPerSecond).toBe(120);
    // 寄せ先は最初と最後の中間
    expect(zoom.middleSeconds).toBe(0.75);
  });

  it("寄りの限界は超えない", () => {
    // 0.1秒間隔なら 600px/秒 が要るが、上限は 120px/秒
    const zoom = zoomForCluster([0, 0.1], [0, 1], GAP_PX, 24);
    expect(zoom.pxPerSecond).toBe(MAX_PX_PER_SECOND);
  });

  // 同じ時刻に重なっている束ねは、いくら寄っても離れない。
  // それでも倍率を上げるのは、押した手応えを返すため(選択は呼び出し側が進める)
  it("間隔が0なら、いまの倍率の倍まで寄る", () => {
    expect(zoomForCluster([2, 2], [0, 1], GAP_PX, 24).pxPerSecond).toBe(48);
    expect(zoomForCluster([2, 2], [0, 1], GAP_PX, 24).middleSeconds).toBe(2);
  });

  it("倍にしても限界は超えない", () => {
    expect(zoomForCluster([2, 2], [0, 1], GAP_PX, 96).pxPerSecond).toBe(
      MAX_PX_PER_SECOND,
    );
  });

  // 束ねの中では、飛び飛びの番号も来る(縮退は左隣との距離で決まるため)
  it("渡された番号だけを見る", () => {
    const times = [0, 10, 10.5, 30];
    const zoom = zoomForCluster(times, [1, 2], GAP_PX, 24);
    expect(zoom.pxPerSecond).toBe(120);
    expect(zoom.middleSeconds).toBe(10.25);
  });
});

// リグレッションテスト: 以前は 30px の固定値で、選択中のコマ(PC 84px)の
// 半分に足りず、0秒に置いたコマが左端で切れていた
describe("LEAD_IN_PX", () => {
  it("いちばん広いコマの半分より広い", () => {
    const widest = Math.max(
      ...Object.values(TIMELINE_LAYOUT).map((l) => l.selectedCardWidth),
    );
    expect(LEAD_IN_PX).toBeGreaterThan(widest / 2);
  });
});
