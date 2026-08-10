import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getProject, insertProject } from "./projects";
import { makeProject } from "@/test/factories";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

const ROW: ProjectRow = {
  id: "project-1",
  user_id: "user-1",
  title: "発表会A",
  stage_width: 14,
  stage_height: 10,
  music_offset_seconds: 0,
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
 * 曲の頭出し(music_offset_seconds)は migration 0003 で足した列。
 * その migration をまだ当てていないDBに対しても、下書きの保存と
 * 読み込みだけは通るようにしてある。
 */
describe("insertProject", () => {
  it("頭出しが既定(0)なら、その列を送らない", async () => {
    const { client, insert } = fakeInsertClient();

    await insertProject(client, makeProject({ musicOffsetSeconds: 0 }));

    expect(insert.mock.calls[0][0]).not.toHaveProperty(
      "music_offset_seconds",
    );
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

describe("getProject", () => {
  it("列がまだ無いDBから読んでも、頭出しは0になる", async () => {
    // migration 前の行。music_offset_seconds が存在しない
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
