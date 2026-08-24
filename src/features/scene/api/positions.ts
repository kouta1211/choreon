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
    // スキーマが古いSupabaseプロジェクトではrowにこれらのキー自体が
    curveControlX: row.curve_control_x,
    curveControlY: row.curve_control_y,
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

/**
 * (scene_id, dancer_id)が複合主キーなので、無ければ作成・あれば更新する。
 *
 * dancer_transition_duration_seconds/curve_control_x/yは、positionが
 * それらの値を持っていない(undefined)場合はペイロードに含めない
 * (JSON.stringifyはundefinedのキーを自動的に落とすため、書き込みリクエスト
 * 自体にキーが現れない)。これにより、スキーマが古いSupabase
 * プロジェクトに対しても、これらの機能を使っていない限りは通常の位置・
 * 向きの保存(ドラッグ・回転)が引き続き問題なく動く
 * (存在しない列への書き込みを試みないため)。
 */
/**
 * 複数のpositionをまとめて保存する。upsertPositionと同じ考え方で、
 * undefinedのフィールドはペイロードに現れない(スキーマが古い
 * プロジェクトでも、その機能を使っていない限り書き込みが通る)
 */
export async function upsertPositions(
  supabase: SupabaseClient<Database>,
  positions: Position[],
): Promise<void> {
  if (positions.length === 0) return;

  const { error } = await supabase.from("positions").upsert(
    positions.map((position) => ({
      scene_id: position.sceneId,
      dancer_id: position.dancerId,
      x_coordinate: position.xCoordinate,
      y_coordinate: position.yCoordinate,
      rotation_angle: position.rotationAngle,
      curve_control_x: position.curveControlX,
      curve_control_y: position.curveControlY,
    })),
    { onConflict: "scene_id,dancer_id" },
  );

  if (error) throw error;
}

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
        curve_control_x: position.curveControlX,
        curve_control_y: position.curveControlY,
      },
      { onConflict: "scene_id,dancer_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return toPosition(data);
}
