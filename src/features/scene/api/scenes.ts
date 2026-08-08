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
    transitionDurationSeconds: row.transition_duration_seconds,
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
      transition_duration_seconds: scene.transitionDurationSeconds,
    })
    .select()
    .single();

  if (error) throw error;
  return toScene(data);
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

export async function updateSceneDuration(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  transitionDurationSeconds: number,
): Promise<void> {
  const { error } = await supabase
    .from("scenes")
    .update({ transition_duration_seconds: transitionDurationSeconds })
    .eq("id", sceneId);

  if (error) throw error;
}

export async function deleteScene(
  supabase: SupabaseClient<Database>,
  sceneId: string,
): Promise<void> {
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) throw error;
}
