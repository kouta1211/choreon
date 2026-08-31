import { describe, expect, it } from "vitest";
import {
  BackupFormatError,
  backupFileName,
  buildBackup,
  parseBackup,
} from "./backup";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";
import { ja } from "@/features/i18n/messages/ja";

const INPUT = {
  project: makeProject({ title: "発表会A", bpm: 128 }),
  dancers: [makeDancer({ id: "d1", name: "うみ" })],
  scenes: [makeScene({ id: "s1", timeSeconds: 4 })],
  positions: [makePosition({ sceneId: "s1", dancerId: "d1", xCoordinate: 7 })],
  exportedAt: "2026-08-13T09:00:00.000Z",
};

describe("buildBackup", () => {
  it("表示に要るものを持ち出す", () => {
    const backup = buildBackup(INPUT);

    expect(backup.project.title).toBe("発表会A");
    expect(backup.project.bpm).toBe(128);
    expect(backup.dancers[0].name).toBe("うみ");
    expect(backup.scenes[0].timeSeconds).toBe(4);
    expect(backup.positions[0].xCoordinate).toBe(7);
  });

  // 合鍵(share_token)や持ち主(user_id)は、手元のファイルに残す意味が無い。
  // 配られたファイルから他人の作品を開ける形にもしない
  it("合鍵と持ち主は持ち出さない", () => {
    const backup = buildBackup(INPUT);
    const serialised = JSON.stringify(backup);

    expect(serialised).not.toContain("shareToken");
    expect(serialised).not.toContain("userId");
  });
});

describe("parseBackup", () => {
  it("書き出したものを読み戻せる", () => {
    const backup = parseBackup(JSON.stringify(buildBackup(INPUT)), ja.data);

    expect(backup.project.title).toBe("発表会A");
    expect(backup.positions).toHaveLength(1);
  });

  // 半端に読み込むと、座標が欠けた作品ができて、
  // どこが壊れているのか後から分からなくなる
  it.each([
    ["JSONでない", "{"],
    ["中身が配列", "[]"],
    ["版が違う", JSON.stringify({ version: 99, project: { title: "x" } })],
    ["作品が無い", JSON.stringify({ version: 1 })],
    [
      "シーンが無い",
      JSON.stringify({ version: 1, project: { title: "x" }, dancers: [] }),
    ],
  ])("%s ときは断る", (_name, raw) => {
    expect(() => parseBackup(raw, ja.data)).toThrow(BackupFormatError);
  });
});

describe("backupFileName", () => {
  it("作品名と日付を並べる", () => {
    expect(backupFileName("発表会A", "2026-08-13T09:00:00.000Z")).toBe(
      "発表会A-2026-08-13.json",
    );
  });

  it("ファイル名に使えない文字を落とす", () => {
    expect(backupFileName('a/b:c', "2026-08-13T00:00:00.000Z")).toBe(
      "abc-2026-08-13.json",
    );
  });

  it("残るものが無ければ既定の名前にする", () => {
    expect(backupFileName("///", "2026-08-13T00:00:00.000Z")).toBe(
      "choreon-2026-08-13.json",
    );
  });
});

/**
 * メトロノームは作品の設定になった（2026-08-18）。書き出し・取り込みでも
 * 持ち運べないと、書き出して入れ直すたびに振付師の設定が落ちる。
 */
describe("メトロノームの設定", () => {
  it("書き出しに入る", () => {
    const backup = buildBackup({
      project: makeProject({ isMetronomeEnabled: true }),
      dancers: [],
      scenes: [],
      positions: [],
      exportedAt: "2026-08-18T00:00:00.000Z",
    });

    expect(backup.project.isMetronomeEnabled).toBe(true);
  });

  it("取り込みで戻る", () => {
    const backup = buildBackup({
      project: makeProject({ isMetronomeEnabled: true }),
      dancers: [],
      scenes: [],
      positions: [],
      exportedAt: "2026-08-18T00:00:00.000Z",
    });

    expect(parseBackup(JSON.stringify(backup), ja.data).project.isMetronomeEnabled).toBe(
      true,
    );
  });

  /** 取り込むファイルは書き換えられる外部入力。真偽値でなければ鳴らさない */
  it.each([
    ["項目が無い（古い書き出し）", undefined],
    ["文字列", "true"],
    ["数値", 1],
    ["null", null],
  ])("真偽値でなければ鳴らさない側へ倒す: %s", (_name, value) => {
    const backup = buildBackup({
      project: makeProject({ isMetronomeEnabled: true }),
      dancers: [],
      scenes: [],
      positions: [],
      exportedAt: "2026-08-18T00:00:00.000Z",
    });
    const broken = JSON.parse(JSON.stringify(backup));
    broken.project.isMetronomeEnabled = value;

    expect(parseBackup(JSON.stringify(broken), ja.data).project.isMetronomeEnabled).toBe(
      false,
    );
  });
});

/**
 * 頭出しの列は musicPlacements の atSeconds へ畳まれた(2026-08-26・第4段)。
 * 古い書き出しにはまだ `musicOffsetSeconds` が残っているので、
 * 取り込むときにここで足し込む(`foldLegacyOffset`)。
 */
describe("旧 musicOffsetSeconds の畳み込み", () => {
  it("古い書き出しの musicOffsetSeconds を、載せ方の atSeconds へ足し込む", () => {
    const raw = JSON.stringify({
      version: 1,
      project: { title: "x", bpm: 120, musicOffsetSeconds: 5 },
      dancers: [],
      scenes: [],
      positions: [],
    });

    expect(parseBackup(raw, ja.data).project.musicPlacements[0].atSeconds).toBe(
      5,
    );
  });

  it("0 のときは畳まない", () => {
    const raw = JSON.stringify({
      version: 1,
      project: { title: "x", bpm: 120, musicOffsetSeconds: 0 },
      dancers: [],
      scenes: [],
      positions: [],
    });

    expect(parseBackup(raw, ja.data).project.musicPlacements[0].atSeconds).toBe(
      0,
    );
  });

  it("項目が無い(新しい書き出し)ときは畳まない", () => {
    const backup = buildBackup(INPUT);

    expect(
      parseBackup(JSON.stringify(backup), ja.data).project.musicPlacements[0]
        .atSeconds,
    ).toBe(INPUT.project.musicPlacements[0].atSeconds);
  });
});

