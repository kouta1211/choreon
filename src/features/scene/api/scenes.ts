import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Scene } from "@/features/scene/types";

type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];

function toScene(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    orderIndex: row.order_index,
    timeSeconds: row.time_seconds,
  };
}

export async function listScenes(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Scene[]> {
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data.map(toScene);
}

/** idは呼び出し側の楽観的更新と合わせるため、こちらで指定する(dancers.createDancerと同じ理由) */
export async function createScene(
  supabase: SupabaseClient<Database>,
  scene: Scene,
): Promise<Scene> {
  const { data, error } = await supabase
    .from("scenes")
    .insert({
      id: scene.id,
      project_id: scene.projectId,
      name: scene.name,
      order_index: scene.orderIndex,
      time_seconds: scene.timeSeconds,
    })
    .select()
    .single();

  if (error) throw error;
  return toScene(data);
}

/** 複数シーンをまとめて作る。ゲストの下書きをクラウドへ移すときに使う
 * (1シーンずつ作ると往復が増えるだけなので、createDancersと同じ扱い) */
export async function createScenes(
  supabase: SupabaseClient<Database>,
  scenes: Scene[],
): Promise<Scene[]> {
  if (scenes.length === 0) return [];

  const { data, error } = await supabase
    .from("scenes")
    .insert(
      scenes.map((scene) => ({
        id: scene.id,
        project_id: scene.projectId,
        name: scene.name,
        order_index: scene.orderIndex,
        time_seconds: scene.timeSeconds,
      })),
    )
    .select();

  if (error) throw error;
  return data.map(toScene);
}

export async function renameScene(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("scenes")
    .update({ name })
    .eq("id", sceneId);

  if (error) throw error;
}

export async function updateSceneOrder(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  orderIndex: number,
): Promise<void> {
  const { error } = await supabase
    .from("scenes")
    .update({ order_index: orderIndex })
    .eq("id", sceneId);

  if (error) throw error;
}

/** シーンの時刻をまとめて書き戻す。
 * 1つ動かすと隣も動くこと(リップル)があるので、常に複数件で受ける */
export async function updateSceneTimes(
  supabase: SupabaseClient<Database>,
  times: { id: string; timeSeconds: number }[],
): Promise<void> {
  if (times.length === 0) return;

  // 1件ずつのupdateを並べる。upsertにすると、他の列(name/order_index)を
  // 送らないぶんが既定値で上書きされてしまう
  const results = await Promise.all(
    times.map(({ id, timeSeconds }) =>
      supabase
        .from("scenes")
        .update({ time_seconds: timeSeconds })
        .eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function deleteScene(
  supabase: SupabaseClient<Database>,
  sceneId: string,
): Promise<void> {
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) throw error;
}
