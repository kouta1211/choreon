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
    })
    .select()
    .single();

  if (error) throw error;
  return toScene(data);
}
