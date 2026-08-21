import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSharedProject } from "./sharedProject";

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const PAYLOAD = {
  project: {
    id: "project-1",
    title: "発表会A",
    stage_width: 14,
    stage_height: 10,
    music_offset_seconds: 12.5,
    bpm: 128,
    beats_per_bar: 4,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  },
  dancers: [
    {
      id: "dancer-1",
      project_id: "project-1",
      name: "うみ",
      color: "#3b82f6",
      initial_direction: 0,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  scenes: [
    {
      id: "scene-1",
      project_id: "project-1",
      name: "サビ入り",
      order_index: 0,
      time_seconds: 4,
    },
  ],
  positions: [
    {
      scene_id: "scene-1",
      dancer_id: "dancer-1",
      x_coordinate: 7,
      y_coordinate: 5,
      rotation_angle: 90,
      dancer_transition_duration_seconds: null,
      curve_control_x: null,
      curve_control_y: null,
    },
  ],
};

function fakeClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(async () => result);
  return {
    client: { rpc } as unknown as SupabaseClient<Database>,
    rpc,
  };
}

describe("getSharedProject", () => {
  it("関数が返した中身をアプリの形へ移す", async () => {
    const { client, rpc } = fakeClient({ data: PAYLOAD, error: null });

    const shared = await getSharedProject(client, TOKEN);

    expect(rpc).toHaveBeenCalledWith("shared_project", { token: TOKEN });
    expect(shared?.project.title).toBe("発表会A");
    expect(shared?.project.musicOffsetSeconds).toBe(12.5);
    expect(shared?.project.bpm).toBe(128);
    expect(shared?.dancers[0].name).toBe("うみ");
    expect(shared?.scenes[0].timeSeconds).toBe(4);
    expect(shared?.positions[0].rotationAngle).toBe(90);
  });

  // 合鍵をそのまま画面へ返すと、見た人がリンクを配り直せる形で持って
  // しまう。関数側でも返していないが、こちら側でも持たせない
  it("合鍵と持ち主は持って帰らない", async () => {
    const { client } = fakeClient({ data: PAYLOAD, error: null });

    const shared = await getSharedProject(client, TOKEN);

    expect(shared?.project.shareToken).toBeNull();
    expect(shared?.project.userId).toBe("");
  });

  /* 曲の【名前】は見る側へ渡さない。ファイル名には個人名や公演名が入る
     （2026-08-21）。要るのは「曲に合わせて組まれた作品か」だけなので、
     真偽値に畳んである */
  it("曲の名前は持って帰らない。あるか無いかだけ持つ", async () => {
    const { client } = fakeClient({
      data: { ...PAYLOAD, project: { ...PAYLOAD.project, has_music: true } },
      error: null,
    });

    const shared = await getSharedProject(client, TOKEN);

    expect(shared?.hasMusic).toBe(true);
    expect(shared?.project.musicTitle).toBeNull();
  });

  /* 関数を入れ替える前の環境では has_music が来ない。そのときだけ
     古い形（music_title）の**有無**から読む。名前は使わない */
  it("古い形（曲名が来る）でも、有無だけを読む", async () => {
    const { client } = fakeClient({
      data: {
        ...PAYLOAD,
        project: { ...PAYLOAD.project, music_title: "山田_発表会.mp3" },
      },
      error: null,
    });

    const shared = await getSharedProject(client, TOKEN);

    expect(shared?.hasMusic).toBe(true);
    expect(shared?.project.musicTitle).toBeNull();
  });

  it("どちらも無ければ、曲は無い作品として扱う", async () => {
    const { client } = fakeClient({ data: PAYLOAD, error: null });

    const shared = await getSharedProject(client, TOKEN);

    expect(shared?.hasMusic).toBe(false);
  });

  // uuidでない文字列を関数へ渡すと、Postgres側の型変換で例外になる。
  // 問い合わせる前に落とす
  it("トークンの形をしていなければ、問い合わせない", async () => {
    const { client, rpc } = fakeClient({ data: PAYLOAD, error: null });

    expect(await getSharedProject(client, "not-a-token")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  // 共有がオフ・トークンが違う・関数がまだ無い、のどれでも同じ結果にする。
  // 区別が付くと「その先に作品がある」ことを外から確かめられてしまう
  it("見せられないものは、理由を問わず null", async () => {
    expect(
      await getSharedProject(fakeClient({ data: null, error: null }).client, TOKEN),
    ).toBeNull();

    expect(
      await getSharedProject(
        fakeClient({ data: null, error: { message: "function does not exist" } })
          .client,
        TOKEN,
      ),
    ).toBeNull();
  });
});
