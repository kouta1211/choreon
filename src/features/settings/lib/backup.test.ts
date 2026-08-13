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
    const backup = parseBackup(JSON.stringify(buildBackup(INPUT)));

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
    expect(() => parseBackup(raw)).toThrow(BackupFormatError);
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
