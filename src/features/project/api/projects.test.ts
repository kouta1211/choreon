import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  getProject,
  insertProject,
  listProjectSummaries,
  updateMusicPlacements,
} from "./projects";
import { makeProject } from "@/test/factories";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

const ROW: ProjectRow = {
  id: "project-1",
  user_id: "user-1",
  title: "発表会A",
  stage_width: 14,
  stage_height: 10,
  music_offset_seconds: 0,
  music_title: null,
  music_path: null,
  bpm: 120,
  beats_per_bar: 4,
  is_metronome_enabled: false,
  music_placements: [{ fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 }],
  share_token: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  is_shared: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/** insert の引数だけを覗くための最小の偽クライアント */
function fakeInsertClient(row: ProjectRow = ROW) {
  // 引数の型を書いておかないと mock.calls[0][0] が型として存在しないことになる。
  // 中身は見ないので受け取るだけ
  const insert = vi.fn((values: Record<string, unknown>) => {
    void values;
    return {
      select: () => ({ single: async () => ({ data: row, error: null }) }),
    };
  });
  const client = { from: () => ({ insert }) };
  return { client: client as unknown as SupabaseClient<Database>, insert };
}

function fakeSelectClient(row: unknown) {
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
      }),
    }),
  };
  return client as unknown as SupabaseClient<Database>;
}

/**
 * 曲の頭出し(music_offset_seconds)は**2026-08-26 に使うのをやめた列**。
 * 「振付が曲の何秒目から始まるか」は載せ方の `atSeconds` が持つ。
 * 列そのものは残っている（DB 側の default が 0）ので、送らないだけ。
 */
describe("insertProject", () => {
  it("頭出しの列は送らない", async () => {
    const { client, insert } = fakeInsertClient();

    await insertProject(client, makeProject());

    expect(insert.mock.calls[0][0]).not.toHaveProperty("music_offset_seconds");
  });
});

/**
 * 一覧のカードに出す長さは、シーンの【時刻】から出す。
 * 以前は transition_duration_seconds を足し上げていたが、その列は
 * 時刻が正になってから更新されていない
 */
function fakeSummaryClient(
  scenes: { id: string; order_index: number; time_seconds: number }[],
) {
  const client = {
    from: (table: string) => {
      if (table === "positions") {
        return {
          select: () => ({ in: async () => ({ data: [], error: null }) }),
        };
      }
      return {
        select: () => ({
          order: async () => ({
            data: [{ ...ROW, scenes, dancers: [] }],
            error: null,
          }),
        }),
      };
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

describe("listProjectSummaries", () => {
  it("作品の長さは、先頭から最後のシーンまでの時刻の差", async () => {
    const summaries = await listProjectSummaries(
      fakeSummaryClient([
        { id: "s1", order_index: 0, time_seconds: 0 },
        { id: "s2", order_index: 1, time_seconds: 4 },
        { id: "s3", order_index: 2, time_seconds: 10.5 },
      ]),
    );

    expect(summaries[0].totalSeconds).toBe(10.5);
    expect(summaries[0].sceneCount).toBe(3);
  });

  // タイムライン上でコマを追い越させると、order_index と時刻の並びは食い違う。
  // 正は時刻なので、長さもサムネイルもそちらに従う
  it("order_index の並びが時刻と食い違っていても、時刻で数える", async () => {
    const summaries = await listProjectSummaries(
      fakeSummaryClient([
        { id: "s1", order_index: 0, time_seconds: 8 },
        { id: "s2", order_index: 1, time_seconds: 2 },
      ]),
    );

    expect(summaries[0].totalSeconds).toBe(6);
  });
});

/**
 * **古い頭出しは、読むときに載せ方へ畳む**（2026-08-26・第4段）。
 *
 * SQL を流さずに移行できるようにしてある。畳む元は DB の値だけなので、
 * 何度読んでも答えは同じ（二重には足さない）。一度でも載せ方を保存すれば、
 * `updateMusicPlacements` が列に 0 を書き戻して DB の側もそろう。
 */
describe("getProject", () => {
  it("列がまだ無いDBから読んでも、載せ方は 0秒 から", async () => {
    const { music_offset_seconds: _omitted, ...legacyRow } = ROW;
    void _omitted;

    const project = await getProject(fakeSelectClient(legacyRow), "project-1");

    expect(project?.musicPlacements[0].atSeconds).toBe(0);
  });

  it("古い頭出しは、載せ方の頭へ足して読む", async () => {
    const project = await getProject(
      fakeSelectClient({ ...ROW, music_offset_seconds: 12.5 }),
      "project-1",
    );

    /* **ここが移行の要**。12.5 を捨てると、頭出しを入れてあった作品の
       振付が曲の頭へずり上がる */
    expect(project?.musicPlacements[0].atSeconds).toBe(12.5);
    // 1拍の長さは変えない（動かすのは置き所だけ）
    expect(project?.musicPlacements[0].secondsPerBeat).toBe(0.5);
  });

  it("載せ方に既に頭がある作品では、そこへ足す", async () => {
    const project = await getProject(
      fakeSelectClient({
        ...ROW,
        music_offset_seconds: 4,
        music_placements: [{ fromBeat: 0, atSeconds: 3, secondsPerBeat: 0.5 }],
      }),
      "project-1",
    );

    expect(project?.musicPlacements[0].atSeconds).toBe(7);
  });
});

describe("updateMusicPlacements", () => {
  /* **保存のたびに古い列を 0 へ戻す。** 戻さないと、次に読んだとき
     もう一度足されて**二重にずれる** */
  it("載せ方と一緒に、古い頭出しの列を 0 にする", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const client = {
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as Parameters<typeof updateMusicPlacements>[0];

    await updateMusicPlacements(client, "project-1", [
      { fromBeat: 0, atSeconds: 12.5, secondsPerBeat: 0.5 },
    ]);

    expect(update.mock.calls[0][0]).toMatchObject({ music_offset_seconds: 0 });
  });
});
