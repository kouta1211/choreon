import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Position } from "@/features/scene/types";

type PositionRow = Database["public"]["Tables"]["positions"]["Row"];

function toPosition(row: PositionRow): Position {
  return {
    sceneId: row.scene_id,
    dancerId: row.dancer_id,
    xCoordinate: row.x_coordinate,
    yCoordinate: row.y_coordinate,
    rotationAngle: row.rotation_angle,
  };
}

export async function listPositionsByScenes(
  supabase: SupabaseClient<Database>,
  sceneIds: string[],
): Promise<Position[]> {
  if (sceneIds.length === 0) return [];

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .in("scene_id", sceneIds);

  if (error) throw error;
  return data.map(toPosition);
}

/** (scene_id, dancer_id)が複合主キーなので、無ければ作成・あれば更新する */
export async function upsertPosition(
  supabase: SupabaseClient<Database>,
  position: Position,
): Promise<Position> {
  const { data, error } = await supabase
    .from("positions")
    .upsert(
      {
        scene_id: position.sceneId,
        dancer_id: position.dancerId,
        x_coordinate: position.xCoordinate,
        y_coordinate: position.yCoordinate,
        rotation_angle: position.rotationAngle,
      },
      { onConflict: "scene_id,dancer_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return toPosition(data);
}
