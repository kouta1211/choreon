import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getProject, insertProject, listProjectSummaries } from "./projects";
import { makeProject } from "@/test/factories";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

const ROW: ProjectRow = {
  id: "project-1",
  user_id: "user-1",
  title: "発表会A",
  stage_width: 14,
  stage_height: 10,
  music_offset_seconds: 0,
  bpm: 120,
  beats_per_bar: 4,
  is_metronome_enabled: false,
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
 * 曲の頭出し(music_offset_seconds)は後から足した列。
 * その列がまだ無い古いスキーマのDBに対しても、下書きの保存と
 * 読み込みだけは通るようにしてある。
 */
describe("insertProject", () => {
  it("頭出しが既定(0)なら、その列を送らない", async () => {
    const { client, insert } = fakeInsertClient();

    await insertProject(client, makeProject({ musicOffsetSeconds: 0 }));

    expect(insert.mock.calls[0][0]).not.toHaveProperty("music_offset_seconds");
  });

  // 黙って捨てると、設定したはずの頭出しが次に開いたとき消えている。
  // 列が無ければ保存が失敗するが、失敗した方が気づける
  it("頭出しが設定されていれば送る", async () => {
    const { client, insert } = fakeInsertClient();

    await insertProject(client, makeProject({ musicOffsetSeconds: 12.5 }));

    expect(insert.mock.calls[0][0]).toMatchObject({
      music_offset_seconds: 12.5,
    });
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

describe("getProject", () => {
  it("列がまだ無いDBから読んでも、頭出しは0になる", async () => {
    // 列を足す前の行。music_offset_seconds が存在しない
    const { music_offset_seconds: _omitted, ...legacyRow } = ROW;
    void _omitted;

    const project = await getProject(fakeSelectClient(legacyRow), "project-1");

    expect(project?.musicOffsetSeconds).toBe(0);
  });

  it("保存されている頭出しをそのまま読む", async () => {
    const project = await getProject(
      fakeSelectClient({ ...ROW, music_offset_seconds: 12.5 }),
      "project-1",
    );

    expect(project?.musicOffsetSeconds).toBe(12.5);
  });
});
