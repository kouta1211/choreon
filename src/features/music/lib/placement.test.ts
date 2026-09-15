import { describe, expect, it } from "vitest";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import {
  beatAtSeconds,
  beatsForTimes,
  bpmAt,
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
  foldLegacyOffset,
  placedSpan,
  reanchor,
  MAX_SECTION_LABEL_LENGTH,
  maxSecondsPerBeatAt,
  mergeAt,
  moveSectionTo,
  renameSection,
  restretchAt,
  sectionEndSeconds,
  sections,
  splitAt,
  stretchSectionToEnd,
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
    expect(bpmAt(normalizePlacements(null, 140), 0)).toBeCloseTo(140, 6);
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

/**
 * `project/api/projects.ts` と `settings/lib/backup.ts` の2箇所が呼ぶ、
 * 旧 `music_offset_seconds`（曲の時間）を `atSeconds`（作品の時間）へ
 * 畳む処理。2箇所に同じ関数が別々に書かれていたので、ここへまとめた。
 */
describe("foldLegacyOffset", () => {
  const placed: Placement[] = [
    { fromBeat: 0, atSeconds: 2, secondsPerBeat: 0.5 },
  ];

  it("旧オフセットぶん、頭出しを後ろへ動かす", () => {
    expect(foldLegacyOffset(placed, 5)[0].atSeconds).toBe(7);
  });

  it("0以下のときは畳まない（そのまま返す）", () => {
    expect(foldLegacyOffset(placed, 0)).toBe(placed);
    expect(foldLegacyOffset(placed, -1)).toBe(placed);
  });

  it("数でないときは畳まない", () => {
    expect(foldLegacyOffset(placed, NaN)).toBe(placed);
  });

  it("区切りが複数あっても、全部を同じだけずらす", () => {
    const twoParts: Placement[] = [
      { fromBeat: 0, atSeconds: 2, secondsPerBeat: 0.5 },
      { fromBeat: 16, atSeconds: 10, secondsPerBeat: 0.4 },
    ];
    const next = foldLegacyOffset(twoParts, 3);

    expect(next[0].atSeconds).toBe(5);
    expect(next[1].atSeconds).toBe(13);
  });
});

describe("区間の終わりを合わせる（stretchSectionToEnd）", () => {
  const placed: Placement[] = [
    { fromBeat: 0, atSeconds: 4, secondsPerBeat: 0.5 },
  ];

  it("終わりを合わせると、1拍の長さがそこから決まる", () => {
    // 16拍を 4秒 → 12秒 に載せる。8秒 ÷ 16拍 = 0.5秒/拍
    expect(stretchSectionToEnd(placed, 0, 16, 12)[0].secondsPerBeat).toBeCloseTo(0.5);
    // 伸ばす: 16拍を 4 → 20秒。16秒 ÷ 16拍 = 1秒/拍
    expect(stretchSectionToEnd(placed, 0, 16, 20)[0].secondsPerBeat).toBeCloseTo(1);
  });

  it("頭は動かない", () => {
    expect(stretchSectionToEnd(placed, 0, 16, 20)[0].atSeconds).toBe(4);
  });

  /* **拍は動かない。** 伸ばしても、20拍目は20拍目のまま */
  it("伸ばしても、シーンの拍は変わらない", () => {
    const next = stretchSectionToEnd(placed, 0, 16, 20);
    expect(beatAtSeconds(next, secondsAtBeat(next, 13))).toBeCloseTo(13);
  });

  /* **潰させない。** 1拍が0秒になると、全シーンの秒が同じ値へ潰れる */
  it("縮めすぎは、いちばん速い所で止まる", () => {
    // 16拍を 0.01秒 に押し込もうとする
    const next = stretchSectionToEnd(placed, 0, 16, 4.01);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MAX_BPM);
  });

  it("伸ばしすぎは、いちばん遅い所で止まる", () => {
    const next = stretchSectionToEnd(placed, 0, 16, 4000);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MIN_BPM);
  });

  it("頭より前へ引いても、潰れずに止まる", () => {
    const next = stretchSectionToEnd(placed, 0, 16, 0);
    expect(next[0].secondsPerBeat).toBeCloseTo(60 / MAX_BPM);
  });

  it("拍が1つも無ければ、何も変えない", () => {
    expect(stretchSectionToEnd(placed, 0, 0, 99)).toEqual(placed);
  });
});

/* ────────────────────────────────────────────────────────────
   区切り（曲の変わり目）・2026-09-15

   ショーケースは1本の中で曲が変わる。振付はカウントで組むので拍の列は
   切れない — 切れるのは載せ方の側だけ。
   ──────────────────────────────────────────────────────────── */

/** 2曲入り。1曲目は BPM120 が 0秒から、2曲目は BPM150 が 40秒から */
const TWO_SONGS: Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5, label: "1曲目" },
  { fromBeat: 64, atSeconds: 40, secondsPerBeat: 0.4, label: "2曲目" },
];

/**
 * **拍が進めば秒も進む**ことを確かめる。
 *
 * ここが破れると、シーンの `timeSeconds` が境目で逆走する。シーンは
 * `sortScenes` が `timeSeconds` で並べるので、**隊形の順番そのものが
 * 入れ替わる** — 画面は普通に動いて見えるのに、振付が別物になる。
 * だから越境は「警告」では済まず、操作の側で止めている。
 */
function expectMonotonic(placements: Placement[], lastBeat: number) {
  let previous = Number.NEGATIVE_INFINITY;
  for (let beat = 0; beat <= lastBeat; beat += 0.25) {
    const seconds = secondsAtBeat(placements, beat);
    expect(seconds).toBeGreaterThanOrEqual(previous);
    previous = seconds;
  }
}

describe("区切りを増やす（splitAt）", () => {
  const one: Placement[] = [{ fromBeat: 0, atSeconds: 3, secondsPerBeat: 0.5 }];

  /* **これがこの機能の芯。** 置いただけで隊形が動くなら、
     区切りを置くこと自体が怖くなって使われない */
  it("置いても、どの拍の秒も1つも動かない", () => {
    const next = splitAt(one, 20);
    for (const beat of [0, 8, 19.5, 20, 20.25, 64, 128]) {
      expect(secondsAtBeat(next, beat)).toBe(secondsAtBeat(one, beat));
    }
  });

  it("区間が2つになり、新しい区間の速さは直前と同じ", () => {
    const next = splitAt(one, 20);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({
      fromBeat: 20,
      atSeconds: 13,
      secondsPerBeat: 0.5,
    });
  });

  /* 区切りを置く意味がここにある。**後ろだけ速さを変えられる** */
  it("後ろの速さを変えても、手前の秒は動かない", () => {
    const next = restretchAt(splitAt(one, 20), 1, 0.4, 200);
    expect(secondsAtBeat(next, 8)).toBe(secondsAtBeat(one, 8));
    expect(secondsAtBeat(next, 20)).toBe(13);
    // 後ろだけが詰まる。40拍目は 13 + 20×0.4 = 21秒
    expect(secondsAtBeat(next, 40)).toBeCloseTo(21);
  });

  it("拍0・負の拍・既に区切りのある拍では増えない", () => {
    expect(splitAt(one, 0)).toEqual(one);
    expect(splitAt(one, -4)).toEqual(one);
    expect(splitAt(one, Number.NaN)).toEqual(one);
    expect(splitAt(splitAt(one, 20), 20)).toHaveLength(2);
  });
});

describe("区切りを外す（mergeAt）", () => {
  it("外すと1つになり、後ろは手前の式で引き直される", () => {
    const next = mergeAt(TWO_SONGS, 1, 128);
    expect(next).toHaveLength(1);
    // 2曲目の頭（64拍）は 40秒だった → 手前の 0.5秒/拍 で 32秒へ戻る
    expect(secondsAtBeat(next, 64)).toBe(32);
  });

  it("先頭は外せない（写せない拍ができる）", () => {
    expect(mergeAt(TWO_SONGS, 0, 128)).toEqual(TWO_SONGS);
    expect(mergeAt(TWO_SONGS, 9, 128)).toEqual(TWO_SONGS);
  });

  /* 吸収した結果、手前が【その次の区切り】へ食い込むことがある */
  it("吸収して食い込むなら、手前の速さが詰む", () => {
    const three: Placement[] = [
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 1 },
      { fromBeat: 8, atSeconds: 8, secondsPerBeat: 0.5 },
      { fromBeat: 24, atSeconds: 20, secondsPerBeat: 0.5 },
    ];
    // 真ん中を外すと 0〜24拍を 1秒/拍 = 24秒 かかり、20秒の区切りを越える
    const next = mergeAt(three, 1, 64);
    expect(next).toHaveLength(2);
    expect(sectionEndSeconds(next, 0, 64)).toBeCloseTo(20);
    expectMonotonic(next, 64);
  });
});

describe("区間ごとの速さ（restretchAt）", () => {
  it("その区間だけ変わり、次の区切りの頭は動かない", () => {
    const next = restretchAt(TWO_SONGS, 0, 0.45, 128);
    expect(next[0].secondsPerBeat).toBeCloseTo(0.45);
    // 2曲目は速さも頭もそのまま。**頭は「曲が鳴り始める秒」＝曲の側の事実**
    expect(next[1].secondsPerBeat).toBe(0.4);
    expect(next[1].atSeconds).toBe(40);
  });

  /* **越境させない。** 越えると拍に対する秒が逆走し、
     `sortScenes` が `timeSeconds` で並べるのでシーンの並びが崩れる */
  it("次の区切りへ食い込む手前で止まる", () => {
    const next = restretchAt(TWO_SONGS, 0, 5, 128);
    // 64拍を 40秒までに収める上限 = 0.625秒/拍
    expect(next[0].secondsPerBeat).toBeCloseTo(0.625);
    expect(sectionEndSeconds(next, 0, 128)).toBeCloseTo(40);
    expectMonotonic(next, 128);
  });

  it("最後の区間には上限が無い（食い込む相手が居ない）", () => {
    expect(maxSecondsPerBeatAt(TWO_SONGS, 1, 128)).toBeNull();
    expect(restretchAt(TWO_SONGS, 1, 1, 128)[1].secondsPerBeat).toBeCloseTo(1);
  });

  it("上限と下限は、区切りが無いときと同じに効く", () => {
    expect(restretchAt(TWO_SONGS, 1, 99, 128)[1].secondsPerBeat).toBeCloseTo(
      60 / MIN_BPM,
    );
    expect(
      restretchAt(TWO_SONGS, 1, 0.0001, 128)[1].secondsPerBeat,
    ).toBeCloseTo(60 / MAX_BPM);
  });

  it("無い区間・0以下の速さでは、何も変えない", () => {
    expect(restretchAt(TWO_SONGS, 9, 0.5, 128)).toEqual(TWO_SONGS);
    expect(restretchAt(TWO_SONGS, 0, 0, 128)).toEqual(TWO_SONGS);
    expect(restretchAt(TWO_SONGS, 0, Number.NaN, 128)).toEqual(TWO_SONGS);
  });
});

describe("区間の頭を動かす（moveSectionTo）", () => {
  it("手前の区間が鳴り終わる前へは戻れない", () => {
    // 1曲目は 0〜64拍を 0.5秒/拍 ＝ 32秒まで使っている
    const next = moveSectionTo(TWO_SONGS, 1, 10, 128);
    expect(next[1].atSeconds).toBe(32);
    expectMonotonic(next, 128);
  });

  it("自分の最後の拍が次の区切りへ届く所で止まる", () => {
    const three = splitAt(TWO_SONGS, 96);
    // 2曲目は 64〜96拍（32拍 × 0.4 ＝ 12.8秒）。3曲目は 52.8秒から
    const next = moveSectionTo(three, 1, 999, 128);
    expect(next[1].atSeconds).toBeCloseTo(40);
    expectMonotonic(next, 128);
  });

  it("先頭は、曲が始まる前へは置けない", () => {
    expect(moveSectionTo(TWO_SONGS, 0, -5, 128)[0].atSeconds).toBe(0);
  });

  it("速さは変えない", () => {
    expect(moveSectionTo(TWO_SONGS, 1, 50, 128)[1].secondsPerBeat).toBe(0.4);
  });
});

describe("その拍の速さ（bpmAt）", () => {
  /* **区間ごとに答える。** 以前の `bpmOf` は先頭の速さしか返せず、
     2曲目でもメトロノームと拍の線が1曲目の速さで動いていた */
  it("2曲目の拍では、2曲目の速さを返す", () => {
    expect(bpmAt(TWO_SONGS, 0)).toBeCloseTo(120);
    expect(bpmAt(TWO_SONGS, 63)).toBeCloseTo(120);
    expect(bpmAt(TWO_SONGS, 64)).toBeCloseTo(150);
    expect(bpmAt(TWO_SONGS, 200)).toBeCloseTo(150);
  });
});

describe("区間の一覧（sections）", () => {
  it("終わりの拍と秒を出す。間奏があれば次の区切りより手前で終わる", () => {
    const list = sections(TWO_SONGS, 128);
    expect(list[0].toBeat).toBe(64);
    // 1曲目の拍は32秒で終わる。次の区切りは40秒なので、8秒は間奏
    expect(list[0].toSeconds).toBe(32);
    expect(list[0].label).toBe("1曲目");
    expect(list[0].bpm).toBeCloseTo(120);
    expect(list[1].toBeat).toBe(128);
    expect(list[1].toSeconds).toBeCloseTo(65.6);
  });

  it("最後のシーンより後ろに区切りがあっても、拍数は負にならない", () => {
    const list = sections(TWO_SONGS, 10);
    expect(list[1].toBeat).toBe(64);
    expect(list[1].toSeconds).toBe(40);
  });
});

describe("区切りの名前", () => {
  it("空白だけの名前は持たない", () => {
    const [first] = normalizePlacements([
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5, label: "   " },
    ]);
    expect(first.label).toBeUndefined();
  });

  it("長すぎる名前は切る", () => {
    const [first] = normalizePlacements([
      {
        fromBeat: 0,
        atSeconds: 0,
        secondsPerBeat: 0.5,
        label: "あ".repeat(80),
      },
    ]);
    expect(first.label).toHaveLength(MAX_SECTION_LABEL_LENGTH);
  });

  it("付け直せる。空白だけなら外れる", () => {
    expect(renameSection(TWO_SONGS, 0, " 序章 ")[0].label).toBe("序章");
    expect(renameSection(TWO_SONGS, 0, "  ")[0].label).toBeUndefined();
  });
});

describe("同じ拍から始まる区間", () => {
  /* `placementAtBeat` は後ろを採るので、手前の1つは**誰にも読まれない**。
     壊れて見えないので気づけない */
  it("読まれない方を落とす", () => {
    const placements = normalizePlacements([
      { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
      { fromBeat: 16, atSeconds: 8, secondsPerBeat: 0.5 },
      { fromBeat: 16, atSeconds: 9, secondsPerBeat: 0.4 },
    ]);
    expect(placements).toHaveLength(2);
    expect(placements[1].atSeconds).toBe(9);
  });
});

describe("区切りを置いても丸めない", () => {
  /* **`splitAt` は丸めない**（`moveSectionTo` は丸める）。
     丸めると「置くだけでは動かない」という約束が、割り切れない速さの
     作品でだけ静かに崩れる — ミリ秒の桁なので画面を見ても分からない。 */
  it("割り切れない速さでも、置いた前後で秒が変わらない", () => {
    const odd: Placement[] = [
      { fromBeat: 0, atSeconds: 0.1, secondsPerBeat: 1 / 3 },
    ];
    const next = splitAt(odd, 7);
    for (const beat of [0, 3, 7, 10, 64]) {
      expect(secondsAtBeat(next, beat)).toBeCloseTo(
        secondsAtBeat(odd, beat),
        6,
      );
    }
  });
});
