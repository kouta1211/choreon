import { describe, expect, it } from "vitest";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import {
  beatAtSeconds,
  beatsForTimes,
  bpmOf,
  durationBeats,
  durationSeconds,
  normalizePlacements,
  restretch,
  sameBeat,
  secondsAtBeat,
  withDerivedTimes,
  type Placement,
  beatOriginSeconds,
  DEFAULT_PLACEMENTS,
  placedSpan,
  reanchor,
  stretchToEnd,
} from "./placement";

/**
 * 拍と秒の写像。**振付は拍で持ち、秒はここから導く。**
 *
 * ここが狂うと、保存されている隊形と画面に出る秒が食い違い、
 * しかも**画面は普通に動いて見える**（数字だけが静かにずれる）。
 */

/** BPM 120。1拍 0.5秒 */
const AT_120: Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
];

/** 途中でテンポが変わる曲。16拍目から1拍 0.25秒（＝倍の速さ）へ */
const CHANGING: Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
  { fromBeat: 16, atSeconds: 8, secondsPerBeat: 0.25 },
];

describe("拍と秒を写す", () => {
  it("拍から秒へ", () => {
    expect(secondsAtBeat(AT_120, 0)).toBe(0);
    expect(secondsAtBeat(AT_120, 8)).toBe(4);
    expect(secondsAtBeat(AT_120, 12.6)).toBeCloseTo(6.3, 9);
  });

  it("秒から拍へ", () => {
    expect(beatAtSeconds(AT_120, 4)).toBe(8);
    expect(beatAtSeconds(AT_120, 6.3)).toBeCloseTo(12.6, 9);
  });

  /* **1カウント目より前に置かれた隊形**。先頭の区間で写すのが正しく、
     0 で止めると手前のシーンが全部先頭へ潰れる */
  it("先頭より手前の拍は、負の秒になる", () => {
    expect(secondsAtBeat(AT_120, -4)).toBe(-2);
    expect(beatAtSeconds(AT_120, -2)).toBe(-4);
  });

  it("テンポの変わり目をまたいでも写せる", () => {
    // 16拍目 = 8秒。そこから4拍で 1秒
    expect(secondsAtBeat(CHANGING, 16)).toBe(8);
    expect(secondsAtBeat(CHANGING, 20)).toBe(9);
    expect(beatAtSeconds(CHANGING, 9)).toBe(20);
  });

  it("変わり目ちょうどは、新しい側で写す", () => {
    expect(secondsAtBeat(CHANGING, 16)).toBe(secondsAtBeat(CHANGING, 16));
    // 15.999拍は古い側（0.5秒/拍）なので、8秒の少し手前
    expect(secondsAtBeat(CHANGING, 15.9)).toBeCloseTo(7.95, 9);
  });

  /* **往復が狂うと、触っていないシーンまで動く。**
     写像そのものでは丸めていないので、ここは正確でなければならない */
  it("拍 → 秒 → 拍 が元へ戻る", () => {
    for (const perBeat of [0.25, 0.4, 0.46875, 0.5, 1.5]) {
      const placements = [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: perBeat }];
      for (const beat of [0, 0.5, 8, 12.6, 137.37, 999.9]) {
        expect(beatAtSeconds(placements, secondsAtBeat(placements, beat))).toBeCloseTo(
          beat,
          9,
        );
      }
    }
  });

  it("空の載せ方でも答えを返す（既定の物差しへ落ちる）", () => {
    expect(secondsAtBeat([], 8)).toBe(4);
  });
});

describe("区間の長さ", () => {
  it("拍の長さを秒へ", () => {
    // 8拍目に着く区間の、手前2拍ぶん = 1秒
    expect(durationSeconds(AT_120, 8, 2)).toBe(1);
  });

  /* **差で出す。** 変わり目をまたぐ区間では「1拍が何秒か」が
     1つに決まらないので、掛け算で出すと答えがずれる */
  it("テンポの変わり目をまたぐ区間は、差で出す", () => {
    // 20拍目(9秒)の手前8拍 = 12拍目(6秒) → 3秒
    expect(durationSeconds(CHANGING, 20, 8)).toBe(3);
    // 掛け算だと 8 × 0.25 = 2秒 になってしまう
    expect(durationSeconds(CHANGING, 20, 8)).not.toBe(2);
  });

  it("秒の長さを拍へ戻せる", () => {
    expect(durationBeats(AT_120, 8, 1)).toBeCloseTo(2, 9);
    expect(durationBeats(CHANGING, 20, 3)).toBeCloseTo(8, 9);
  });
});

describe("壊れた載せ方を通さない（門番）", () => {
  /* jsonb は DB が中身を守らない。1つ壊れた値が入るだけで、
     全シーンの秒が Infinity になり「シーンが1つも無い」ように見える */
  const broken: unknown[] = [
    null,
    undefined,
    {},
    "配列ではない",
    [],
    [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: 0 }],
    [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: -1 }],
    [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: Number.NaN }],
    [{ fromBeat: Number.POSITIVE_INFINITY, atSeconds: 0, secondsPerBeat: 0.5 }],
    [{ atSeconds: 0 }],
  ];

  it.each(broken.map((raw, index) => [index, raw] as const))(
    "壊れた入力 %i でも、有限の秒を返す",
    (_index, raw) => {
      const placements = normalizePlacements(raw, 120);
      const seconds = secondsAtBeat(placements, 8);
      expect(Number.isFinite(seconds)).toBe(true);
      expect(seconds).toBe(4);
    },
  );

  it("並びが逆でも、拍の順に直す", () => {
    const placements = normalizePlacements([
      { fromBeat: 16, atSeconds: 8, secondsPerBeat: 0.25 },
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
    ]);
    expect(placements.map((item) => item.fromBeat)).toEqual([0, 16]);
    expect(secondsAtBeat(placements, 20)).toBe(9);
  });

  it("壊れた要素だけを落とし、残りは活かす", () => {
    const placements = normalizePlacements([
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
      { fromBeat: 16, atSeconds: 8, secondsPerBeat: 0 },
    ]);
    expect(placements).toHaveLength(1);
    expect(secondsAtBeat(placements, 20)).toBe(10);
  });

  it("先頭が0拍から始まっていなければ、0へ寄せる", () => {
    const placements = normalizePlacements([
      { fromBeat: 8, atSeconds: 4, secondsPerBeat: 0.5 },
    ]);
    expect(placements[0].fromBeat).toBe(0);
  });

  it("何も取れなければ、渡された速さへ落ちる", () => {
    expect(bpmOf(normalizePlacements(null, 140))).toBeCloseTo(140, 6);
  });
});

describe("派生した秒を載せる", () => {
  const scenes = [
    { id: "s1", positionBeats: 0, moveBeats: null },
    { id: "s2", positionBeats: 8, moveBeats: 2 },
    { id: "s3", positionBeats: 12.6, moveBeats: undefined },
  ];

  it("拍から秒を作る", () => {
    const derived = withDerivedTimes(scenes, AT_120);
    expect(derived.map((scene) => scene.timeSeconds)).toEqual([0, 4, 6.3]);
  });

  it("移動時間は、区間の長さとして差から出す", () => {
    const derived = withDerivedTimes(scenes, AT_120);
    expect(derived[1].moveSeconds).toBe(1);
    // 決めていなければ null のまま（区間まるごと）
    expect(derived[0].moveSeconds).toBeNull();
    expect(derived[2].moveSeconds).toBeNull();
  });

  it("元の項目を落とさない", () => {
    expect(withDerivedTimes(scenes, AT_120)[0].id).toBe("s1");
  });

  it("秒で来た変更を拍へ直す", () => {
    const beats = beatsForTimes(new Map([["s2", 6]]), AT_120);
    expect(beats.get("s2")).toBe(12);
  });
});

/**
 * **速さを変えても、拍は1つも動かない**（2026-08-26・第4段）。
 *
 * 以前はここに `regrid`（秒を保って拍を数え直す）と対で書いていた。
 * カウントを画面に出した時点で、数え直す側は**振付の中身を書き換える**
 * 操作になったので消した。残ったのは `restretch` の一本道。
 */
describe("曲へ載せ直す（restretch）", () => {
  it("拍を保ったまま、秒を動かす", () => {
    const next = restretch(AT_120, 60 / 128);

    // 8拍は8拍のまま。秒の方が縮む
    expect(secondsAtBeat(next, 8)).toBeCloseTo(3.75, 6);
    expect(secondsAtBeat(next, 8)).not.toBeCloseTo(4, 3);
  });

  /* **カウントが動かないことが、この操作の約束。**
     同じ秒を引き直すと同じ拍に戻る */
  it("速さを変えても、同じ拍は同じ拍のまま", () => {
    const next = restretch(AT_120, 60 / 128);
    expect(beatAtSeconds(next, secondsAtBeat(next, 20))).toBeCloseTo(20);
  });

  it("区切りが複数あっても、全部の速さが揃う", () => {
    const next = restretch(CHANGING, 60 / 128);
    expect(next.map((item) => item.secondsPerBeat)).toEqual([
      60 / 128,
      60 / 128,
    ]);
  });

  it("壊れた速さを渡されたら、何も変えない", () => {
    expect(restretch(AT_120, Number.NaN)).toEqual(AT_120);
    expect(restretch(AT_120, 0)).toEqual(AT_120);
  });
});

/**
 * **既存作品を1ミリも動かさない**という約束の、唯一の直接の表現。
 *
 * 半端な秒を必ず混ぜる（拍に乗っていない作品がほとんど）。
 */
describe("移行しても、秒が1ミリも動かないこと", () => {
  const REAL_TIMES = [0, 0.1, 3.7, 12.34, 12.44, 27.3, 88.8, 241.9];

  it.each([40, 100, 120, 128, 140, 240])(
    "BPM %i の作品で、秒→拍→秒 が一致する",
    (bpm) => {
      const perBeat = 60 / bpm;
      const placements: Placement[] = [
        { fromBeat: 0, atSeconds: 0, secondsPerBeat: perBeat },
      ];
      // SQL の backfill と同じ式で拍にする
      const scenes = REAL_TIMES.map((seconds, index) => ({
        id: `s${index}`,
        positionBeats: seconds / perBeat,
        moveBeats: null,
      }));

      const derived = withDerivedTimes(scenes, placements);
      expect(derived.map((scene) => scene.timeSeconds)).toEqual(REAL_TIMES);
    },
  );
});

/**
 * **秒で `===` を書かないための道具。**
 * 秒は派生値なので `4.000000000000001` のような値になり、
 * 等号で比べると「動かしていない行まで変わった」ことになる。
 */
describe("同じ位置とみなすか", () => {
  it("丸めの誤差は同じ位置とみなす", () => {
    expect(sameBeat(8, 8.0000000001)).toBe(true);
  });

  it("人が作れる差は、別の位置とみなす", () => {
    // 0.001拍 = BPM 120 で 0.5ミリ秒。入力欄の刻み(0.1秒)よりずっと細かい
    expect(sameBeat(8, 8.001)).toBe(false);
  });

  it("負の拍でも効く（1カウント目より手前）", () => {
    expect(sameBeat(-4, -4.0000000001)).toBe(true);
    expect(sameBeat(-4, -3.9)).toBe(false);
  });
});

describe("beatOriginSeconds", () => {
  it("最初の載せ方の atSeconds を返す（作品の時間で測る）", () => {
    expect(
      beatOriginSeconds([
        { fromBeat: 0, atSeconds: 1.25, secondsPerBeat: 0.5 },
        { fromBeat: 16, atSeconds: 9.25, secondsPerBeat: 0.4 },
      ]),
    ).toBe(1.25);
  });

  it("空なら既定（0拍目が0秒）", () => {
    expect(beatOriginSeconds([])).toBe(0);
  });

  it("曲を入れていない作品の既定は 0 — 頭出しとは無関係", () => {
    expect(beatOriginSeconds(DEFAULT_PLACEMENTS)).toBe(0);
  });
});

/**
 * **曲へ載せる**（第3段）。
 *
 * 決めるのは「どこから」と「どれだけ」の2つだけで、**拍は1つも
 * 動かない**。ここで縛るのは、載せ直しても振付の中身（何カウント目に
 * どの隊形か）が変わらないこと。
 */
describe("placedSpan", () => {
  /* 1拍 0.5秒（BPM 120）で、5秒目から載せてある */
  const placed: Placement[] = [
    { fromBeat: 0, atSeconds: 5, secondsPerBeat: 0.5 },
  ];

  it("頭は載せ方の atSeconds、終わりは最後の拍の秒", () => {
    // 20拍 = 10秒ぶん。5 + 10 = 15
    expect(placedSpan(placed, 20)).toEqual({
      fromSeconds: 5,
      toSeconds: 15,
    });
  });

  it("拍が1つも無ければ、長さ0の区間", () => {
    expect(placedSpan(placed, 0)).toEqual({ fromSeconds: 5, toSeconds: 5 });
  });

  it("空の載せ方でも落ちない", () => {
    expect(placedSpan([], 8)).toEqual({ fromSeconds: 0, toSeconds: 4 });
  });
});

describe("reanchor", () => {
  const placed: Placement[] = [
    { fromBeat: 0, atSeconds: 5, secondsPerBeat: 0.5 },
  ];

  it("頭を動かしても、1拍の長さは変わらない", () => {
    const next = reanchor(placed, 12);
    expect(next[0].atSeconds).toBe(12);
    expect(next[0].secondsPerBeat).toBe(0.5);
  });

  /* **拍は動かない。** 動くのは秒だけ、というのがこの操作の約束 */
  it("拍から出る秒が、ずらしたぶんだけ動く", () => {
    const next = reanchor(placed, 12);
    // 20拍目は 5+10=15秒 → 12+10=22秒
    expect(secondsAtBeat(next, 20)).toBe(22);
    // 拍の側は変わっていない（同じ秒を引き直せば同じ拍に戻る）
    expect(beatAtSeconds(next, 22)).toBeCloseTo(20);
  });

  /* **区切りが複数あるときは、全部を同じだけずらす。**
     先頭だけ動かすと、テンポの変わり目より後ろが置き去りになる */
  it("テンポの変わる曲でも、区切りぜんぶが同じだけ動く", () => {
    const twoParts: Placement[] = [
      { fromBeat: 0, atSeconds: 5, secondsPerBeat: 0.5 },
      { fromBeat: 16, atSeconds: 13, secondsPerBeat: 0.4 },
    ];
    const next = reanchor(twoParts, 8);

    expect(next[0].atSeconds).toBe(8);
    expect(next[1].atSeconds).toBe(16);
    // 変わり目の後ろの拍も、ずらしたぶん（5 → 8 なので +3）だけ動いている
    expect(secondsAtBeat(next, 20)).toBeCloseTo(secondsAtBeat(twoParts, 20) + 3);
  });

  it("曲が始まる前へは置けない", () => {
    expect(reanchor(placed, -3)[0].atSeconds).toBe(0);
  });
});

describe("stretchToEnd", () => {
  const placed: Placement[] = [
    { fromBeat: 0, atSeconds: 4, secondsPerBeat: 0.5 },
  ];

  it("終わりを合わせると、1拍の長さがそこから決まる", () => {
    // 16拍を 4秒 → 12秒 に載せる。8秒 ÷ 16拍 = 0.5秒/拍
    expect(stretchToEnd(placed, 16, 12)[0].secondsPerBeat).toBeCloseTo(0.5);
    // 伸ばす: 16拍を 4 → 20秒。16秒 ÷ 16拍 = 1秒/拍
    expect(stretchToEnd(placed, 16, 20)[0].secondsPerBeat).toBeCloseTo(1);
  });

  it("頭は動かない", () => {
    expect(stretchToEnd(placed, 16, 20)[0].atSeconds).toBe(4);
  });

  /* **拍は動かない。** 伸ばしても、20拍目は20拍目のまま */
  it("伸ばしても、シーンの拍は変わらない", () => {
    const next = stretchToEnd(placed, 16, 20);
    expect(beatAtSeconds(next, secondsAtBeat(next, 13))).toBeCloseTo(13);
  });

  /* **潰させない。** 1拍が0秒になると、全シーンの秒が同じ値へ潰れる */
  it("縮めすぎは、いちばん速い所で止まる", () => {
    // 16拍を 0.01秒 に押し込もうとする
    const next = stretchToEnd(placed, 16, 4.01);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MAX_BPM);
  });

  it("伸ばしすぎは、いちばん遅い所で止まる", () => {
    const next = stretchToEnd(placed, 16, 4000);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MIN_BPM);
  });

  it("頭より前へ引いても、潰れずに止まる", () => {
    const next = stretchToEnd(placed, 16, 0);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MAX_BPM);
  });

  it("拍が1つも無ければ、何も変えない", () => {
    expect(stretchToEnd(placed, 0, 99)).toEqual(placed);
  });
});
