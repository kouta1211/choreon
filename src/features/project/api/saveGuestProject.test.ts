import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { saveGuestProject } from "./saveGuestProject";
import * as projectsApi from "@/features/project/api/projects";
import * as dancersApi from "@/features/dancer/api/dancers";
import * as scenesApi from "@/features/scene/api/scenes";
import * as positionsApi from "@/features/scene/api/positions";
import { createGuestProject } from "@/features/project/lib/guestProject";
import { ja } from "@/features/i18n/messages/ja";

const GUEST_WORDS = {
  title: ja.projects.guestTitle,
  sceneName: ja.projects.sceneName,
};

const supabase = {} as SupabaseClient<Database>;

function stubAll() {
  const insertProject = vi
    .spyOn(projectsApi, "insertProject")
    .mockImplementation(async (_client, project) => project);
  const createDancers = vi
    .spyOn(dancersApi, "createDancers")
    .mockResolvedValue([]);
  const createScenes = vi
    .spyOn(scenesApi, "createScenes")
    .mockResolvedValue([]);
  const upsertPositions = vi
    .spyOn(positionsApi, "upsertPositions")
    .mockResolvedValue(undefined);
  const deleteProject = vi
    .spyOn(projectsApi, "deleteProject")
    .mockResolvedValue(undefined);

  return {
    insertProject,
    createDancers,
    createScenes,
    upsertPositions,
    deleteProject,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveGuestProject", () => {
  it("プロジェクト・ダンサー・シーン・配置をまとめて入れる", async () => {
    const api = stubAll();
    const snapshot = createGuestProject(GUEST_WORDS);

    await saveGuestProject(supabase, "user-1", snapshot);

    expect(api.insertProject).toHaveBeenCalledTimes(1);
    expect(api.createDancers.mock.calls[0][1]).toHaveLength(4);
    expect(api.createScenes.mock.calls[0][1]).toHaveLength(2);
    expect(api.upsertPositions.mock.calls[0][1]).toHaveLength(8);
  });

  it("下書きのIDをそのまま使わない(2回保存しても主キーが衝突しない)", async () => {
    const api = stubAll();
    const snapshot = createGuestProject(GUEST_WORDS);

    await saveGuestProject(supabase, "user-1", snapshot);
    await saveGuestProject(supabase, "user-1", snapshot);

    const first = api.insertProject.mock.calls[0][1].id;
    const second = api.insertProject.mock.calls[1][1].id;
    expect(first).not.toBe(snapshot.project.id);
    expect(first).not.toBe(second);
  });

  it("ログインしたユーザーを持ち主にする", async () => {
    const api = stubAll();

    await saveGuestProject(supabase, "user-1", createGuestProject(GUEST_WORDS));

    expect(api.insertProject.mock.calls[0][1].userId).toBe("user-1");
  });

  it("途中で失敗したらプロジェクトごと消して、中途半端に残さない", async () => {
    const api = stubAll();
    api.upsertPositions.mockRejectedValue(new Error("network"));

    await expect(
      saveGuestProject(supabase, "user-1", createGuestProject(GUEST_WORDS)),
    ).rejects.toThrow("network");

    expect(api.deleteProject).toHaveBeenCalledTimes(1);
  });

  it("後片付けにも失敗した場合、報告するのは元の失敗の方", async () => {
    const api = stubAll();
    api.createScenes.mockRejectedValue(new Error("シーンの保存に失敗"));
    api.deleteProject.mockRejectedValue(new Error("片付けにも失敗"));

    await expect(
      saveGuestProject(supabase, "user-1", createGuestProject(GUEST_WORDS)),
    ).rejects.toThrow("シーンの保存に失敗");
  });
});
