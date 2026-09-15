import { describe, expect, it } from "vitest";
import { beatFromCountLabel, countLabelAtBeat } from "./countLabel";
import type { Placement } from "./placement";

/** 名前を付けていないときの既定。辞書（`t.music.sectionDefaultName`）の代わり */
const songName = (order: number) => `${order}曲目`;

const ONE: Placement[] = [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 }];

/** 2曲目は 64拍目（8セット目の終わり）から */
const TWO: Placement[] = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
  { fromBeat: 64, atSeconds: 40, secondsPerBeat: 0.4 },
];

describe("カウントの見せ方", () => {
  /* ほとんどの作品は区切りが1つ。ここが変わってはいけない */
  it("区切りが1つなら、今までどおり 3-5 だけ", () => {
    expect(countLabelAtBeat(0, ONE, songName)).toBe("1-1");
    expect(countLabelAtBeat(20, ONE, songName)).toBe("3-5");
    expect(countLabelAtBeat(200, ONE, songName)).toBe("26-1");
  });

  /* 通しで数えると5分の作品が 68-3 になり、誰も口に出さない数になる */
  it("区切りが2つ以上なら、曲ごとに1から数え直す", () => {
    expect(countLabelAtBeat(20, TWO, songName)).toBe("1曲目 3-5");
    // 64拍目は2曲目の頭 → 1-1 に戻る（通しなら 9-1）
    expect(countLabelAtBeat(64, TWO, songName)).toBe("2曲目 1-1");
    expect(countLabelAtBeat(84, TWO, songName)).toBe("2曲目 3-5");
  });

  it("名前を付けてあれば、その名前で出す", () => {
    const named: Placement[] = [
      { ...TWO[0], label: "イントロ" },
      { ...TWO[1], label: "サビ" },
    ];
    expect(countLabelAtBeat(20, named, songName)).toBe("イントロ 3-5");
    expect(countLabelAtBeat(84, named, songName)).toBe("サビ 3-5");
  });

  it("振付の頭より手前は 1-1 として扱う", () => {
    expect(countLabelAtBeat(-4, ONE, songName)).toBe("1-1");
  });

  it("載せ方が空でも落ちない", () => {
    expect(countLabelAtBeat(20, [], songName)).toBe("3-5");
  });
});

describe("打たれたカウントを拍へ戻す", () => {
  it("区切りが1つなら、今までどおり", () => {
    expect(beatFromCountLabel("3-5", 0, ONE)).toBe(20);
    expect(beatFromCountLabel("1-1", 0, ONE)).toBe(0);
  });

  /* **その区切りの中での 4-3** として読む。曲をまたいで飛ばさない */
  it("2曲目の欄に打った 3-5 は、2曲目の 3-5 になる", () => {
    // いま 84拍目（2曲目の3-5）に居る欄へ 1-1 と打つ → 2曲目の頭へ
    expect(beatFromCountLabel("1-1", 84, TWO)).toBe(64);
    expect(beatFromCountLabel("3-5", 84, TWO)).toBe(84);
    // 1曲目に居る欄なら、今までどおり頭から数える
    expect(beatFromCountLabel("3-5", 20, TWO)).toBe(20);
  });

  it("読めない値は null（呼ぶ側が前の値へ戻す）", () => {
    expect(beatFromCountLabel("0-0", 84, TWO)).toBeNull();
    expect(beatFromCountLabel("1-9", 84, TWO)).toBeNull();
    expect(beatFromCountLabel("あ", 84, TWO)).toBeNull();
  });

  /* 往復して同じ所へ戻ること。ここが崩れると、打ち直すたびにコマが動く */
  it("出した形を打ち直すと、同じ拍へ戻る", () => {
    for (const beat of [0, 20, 64, 84, 130]) {
      const label = countLabelAtBeat(beat, TWO, songName);
      const bare = label.replace(/^\S+\s/, "");
      expect(beatFromCountLabel(bare, beat, TWO)).toBe(beat);
    }
  });
});
