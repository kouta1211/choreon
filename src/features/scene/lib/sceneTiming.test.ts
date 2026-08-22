import { describe, expect, it } from "vitest";
import {
  insertTimeSeconds,
  uniformTimes,
  DEFAULT_SEGMENT_SECONDS,
  duplicateTimeSeconds,
  MIN_SEGMENT_SECONDS,
  moveSceneTo,
  retimeForOrder,
  sortScenes,
  retimeScene,
  sceneDurations,
  totalSeconds,
} from "./sceneTiming";

/** 0s / 2s / 5s / 7s に置かれた4シーン */
const SCENES = [
  { id: "a", timeSeconds: 0 },
  { id: "b", timeSeconds: 2 },
  { id: "c", timeSeconds: 5 },
  { id: "d", timeSeconds: 7 },
];

describe("sceneDurations", () => {
  it("時刻の差が移動時間になる。先頭は0", () => {
    expect(sceneDurations(SCENES)).toEqual([0, 2, 3, 2]);
  });

  it("シーンが無ければ空", () => {
    expect(sceneDurations([])).toEqual([]);
  });

  it("小数を引いても誤差が残らない", () => {
    const durations = sceneDurations([
      { id: "a", timeSeconds: 0 },
      { id: "b", timeSeconds: 0.1 },
      { id: "c", timeSeconds: 0.3 },
    ]);
    expect(durations).toEqual([0, 0.1, 0.2]);
  });

  // 並び替えの途中など、一時的に順序が壊れることがある
  it("前より早いシーンがあっても負を返さない", () => {
    const durations = sceneDurations([
      { id: "a", timeSeconds: 5 },
      { id: "b", timeSeconds: 2 },
    ]);
    expect(durations).toEqual([0, 0]);
  });
});

describe("totalSeconds", () => {
  it("先頭から最後までの長さ", () => {
    expect(totalSeconds(SCENES)).toBe(7);
  });

  it("シーンが1つなら0", () => {
    expect(totalSeconds([{ id: "a", timeSeconds: 3 }])).toBe(0);
  });
});

describe("retimeScene", () => {
  // この機能の要。触っていないシーンは動かない
  it("既定では、変えたシーンだけが動く", () => {
    const { timesById } = retimeScene(SCENES, 1, 4, false);
    expect(timesById.get("a")).toBe(0);
    expect(timesById.get("b")).toBe(4);
    expect(timesById.get("c")).toBe(5);
    expect(timesById.get("d")).toBe(7);
  });

  it("リップルなら、以降がまとめて同じだけずれる", () => {
    const { timesById } = retimeScene(SCENES, 1, 4, true);
    expect(timesById.get("a")).toBe(0);
    expect(timesById.get("b")).toBe(4);
    expect(timesById.get("c")).toBe(7);
    expect(timesById.get("d")).toBe(9);
  });

  // 次のシーンを押しのけない。手前の余地いっぱいで止まる
  it("次のシーンに届くところで頭打ちになる", () => {
    const { timesById, appliedSeconds } = retimeScene(SCENES, 1, 99, false);
    expect(timesById.get("b")).toBe(5 - MIN_SEGMENT_SECONDS);
    expect(timesById.get("c")).toBe(5);
    expect(appliedSeconds).toBe(5 - MIN_SEGMENT_SECONDS);
  });

  it("リップルなら頭打ちにならない", () => {
    const { timesById, appliedSeconds } = retimeScene(SCENES, 1, 20, true);
    expect(timesById.get("b")).toBe(20);
    expect(timesById.get("c")).toBe(23);
    expect(appliedSeconds).toBe(20);
  });

  it("0以下にはできない", () => {
    const { appliedSeconds } = retimeScene(SCENES, 1, 0, false);
    expect(appliedSeconds).toBe(MIN_SEGMENT_SECONDS);
  });

  // 先頭シーンには「入ってくる時間」が無い
  it("先頭シーンは動かさない", () => {
    const { timesById } = retimeScene(SCENES, 0, 5, false);
    expect(timesById.get("a")).toBe(0);
  });

  it("最後のシーンは後ろが無いので詰まらない", () => {
    const { timesById } = retimeScene(SCENES, 3, 10, false);
    expect(timesById.get("d")).toBe(15);
  });
});

describe("moveSceneTo", () => {
  it("指定した時刻へ動かす", () => {
    expect(moveSceneTo(SCENES, 2, 4).get("c")).toBe(4);
  });

  // 並び順は時刻の昇順で決まるので、追い越せばそのまま順番が入れ替わる。
  // 手前で止めると「3番目を頭に持ってくる」がこの操作でできなくなる
  it("前のシーンを追い越せる", () => {
    const times = moveSceneTo(SCENES, 2, 1);
    expect(times.get("c")).toBe(1);
    expect(times.get("b")).toBe(2);
  });

  it("次のシーンを追い越せる", () => {
    expect(moveSceneTo(SCENES, 2, 99).get("c")).toBe(99);
  });

  it("曲の頭より手前へは行かない", () => {
    expect(moveSceneTo(SCENES, 0, -5).get("a")).toBe(0);
  });

  // 同じ時刻に2つ置くと、どちらの隊形を出すか決まらなくなる
  it("既に居るところへ置こうとしたらずらす", () => {
    expect(moveSceneTo(SCENES, 2, 2).get("c")).toBe(2 + MIN_SEGMENT_SECONDS);
  });
});

describe("retimeForOrder", () => {
  const ids = (scenes: { id: string }[]) => scenes.map((s) => s.id);

  it("動かした行だけが、新しい隣同士の中間へ来る", () => {
    // c(5秒) を b(2秒) の手前へ動かす → a(0) と b(2) の中間 = 1秒
    const times = retimeForOrder(SCENES, ["a", "c", "b", "d"]);
    expect(times.get("c")).toBe(1);
    expect(times.get("a")).toBe(0);
    expect(times.get("b")).toBe(2);
    expect(times.get("d")).toBe(7);
  });

  it("先頭へ動かしたら曲の頭との中間へ", () => {
    expect(retimeForOrder(SCENES, ["c", "a", "b", "d"]).get("c")).toBe(0);
  });

  it("末尾へ動かしたら最後のシーンの後ろへ", () => {
    const times = retimeForOrder(SCENES, ["a", "c", "d", "b"]);
    expect(times.get("b")).toBe(7 + DEFAULT_SEGMENT_SECONDS);
  });

  it("並びが変わっていなければ何も動かさない", () => {
    const times = retimeForOrder(SCENES, ids(SCENES));
    SCENES.forEach((scene) => {
      expect(times.get(scene.id)).toBe(scene.timeSeconds);
    });
  });
});

/**
 * **曲を鳴らしている最中に押したときだけ**通る道
 * （止まっているときは duplicateTimeSeconds が正）。
 */
describe("insertTimeSeconds", () => {
  it("押した瞬間の再生位置に置く", () => {
    expect(insertTimeSeconds(SCENES, 3.4)).toBe(3.4);
  });

  // 負の秒はまず曲の頭へ寄り、そこに先頭シーンが居るので割り込む
  it("負の秒は曲の頭に寄せる", () => {
    expect(insertTimeSeconds(SCENES, -2)).toBe(1);
    expect(insertTimeSeconds([], -2)).toBe(0);
  });

  // そこに既に居るなら、次のシーンとの中間へ割り込む
  it("既にシーンがある位置なら中間へ割り込む", () => {
    expect(insertTimeSeconds(SCENES, 2)).toBe(3.5);
  });

  it("最後のシーンに重なったら後ろへ足す", () => {
    expect(insertTimeSeconds(SCENES, 7)).toBe(7 + DEFAULT_SEGMENT_SECONDS);
  });

  it("シーンが無ければその時刻のまま", () => {
    expect(insertTimeSeconds([], 12)).toBe(12);
  });
});

describe("duplicateTimeSeconds", () => {
  it("元のシーンと、次のシーンの中間へ置く", () => {
    expect(duplicateTimeSeconds(SCENES, SCENES[1])).toBe(3.5);
  });

  it("次が無ければ既定の間隔ぶん後ろへ置く", () => {
    expect(duplicateTimeSeconds(SCENES, SCENES[3])).toBe(
      7 + DEFAULT_SEGMENT_SECONDS,
    );
  });

  // 設定の「シーンの間隔」を渡せる。曲が無いときの追加はここを通るので、
  // 2秒に設定していれば2秒ずつ並ぶ
  it("末尾へ足すときの間隔は指定できる", () => {
    expect(duplicateTimeSeconds(SCENES, SCENES[3], 2)).toBe(9);
  });

  // 先に詰め込んでしまった作品を開いたときの道。中間が取れなくても
  // 同じ時刻には重ねない
  it("元と次が詰まっていても、最低限は空けて割り込む", () => {
    const crammed = [
      { id: "a", timeSeconds: 0 },
      { id: "b", timeSeconds: 0.1 },
    ];
    expect(duplicateTimeSeconds(crammed, crammed[0])).toBe(MIN_SEGMENT_SECONDS);
  });

  it("知らないシーンを渡されたら、その時刻の後ろへ置く", () => {
    expect(duplicateTimeSeconds(SCENES, { id: "x", timeSeconds: 3 })).toBe(
      3 + DEFAULT_SEGMENT_SECONDS,
    );
  });
});

describe("sortScenes", () => {
  it("時刻の昇順に並べる", () => {
    const sorted = sortScenes([
      { id: "b", timeSeconds: 5, orderIndex: 0 },
      { id: "a", timeSeconds: 1, orderIndex: 1 },
    ]);
    expect(sorted.map((scene) => scene.id)).toEqual(["a", "b"]);
  });

  it("同じ時刻なら元の並びを保つ", () => {
    const sorted = sortScenes([
      { id: "second", timeSeconds: 2, orderIndex: 1 },
      { id: "first", timeSeconds: 2, orderIndex: 0 },
    ]);
    expect(sorted.map((scene) => scene.id)).toEqual(["first", "second"]);
  });
});

describe("uniformTimes", () => {
  it("全部を同じ秒数で積む", () => {
    const times = uniformTimes(["a", "b", "c"], 4);
    expect([...times.values()]).toEqual([0, 4, 8]);
  });

  it("先頭は0から始まる", () => {
    expect(uniformTimes(["a"], 4).get("a")).toBe(0);
  });

  it("秒数を変えれば、間隔もそのぶん変わる", () => {
    expect([...uniformTimes(["a", "b"], 1.5).values()]).toEqual([0, 1.5]);
  });

  /* 0 にすると全部が同じ時刻に重なり、どの隊形を出すか決まらなくなる */
  it("0 を渡されても、最小の間隔は空ける", () => {
    const times = uniformTimes(["a", "b"], 0);
    expect(times.get("b")).toBe(MIN_SEGMENT_SECONDS);
  });

  it("シーンが無ければ空", () => {
    expect(uniformTimes([], 4).size).toBe(0);
  });
});
