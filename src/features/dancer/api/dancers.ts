import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Dancer } from "@/features/dancer/types";

type DancerRow = Database["public"]["Tables"]["dancers"]["Row"];

function toDancer(row: DancerRow): Dancer {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    initialDirection: row.initial_direction,
    createdAt: row.created_at,
  };
}

export async function listDancers(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Dancer[]> {
  const { data, error } = await supabase
    .from("dancers")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map(toDancer);
}

/**
 * idは呼び出し側(楽観的更新でローカルstoreに先に追加した値)をそのまま使う。
 * 挿入後にIDを差し替える必要が無くなり、ロールバック処理も単純になる
 */
export async function createDancer(
  supabase: SupabaseClient<Database>,
  dancer: Pick<Dancer, "id" | "projectId" | "name" | "color" | "initialDirection">,
): Promise<Dancer> {
  const { data, error } = await supabase
    .from("dancers")
    .insert({
      id: dancer.id,
      project_id: dancer.projectId,
      name: dancer.name,
      color: dancer.color,
      initial_direction: dancer.initialDirection,
    })
    .select()
    .single();

  if (error) throw error;
  return toDancer(data);
}

/**
 * 複数のダンサーをまとめて作る。1人ずつinsertすると、20人追加したときに
 * 20往復することになるため、1回のリクエストにまとめる。
 * idは呼び出し側が採番したものをそのまま使う(createDancerと同じ理由)
 */
export async function createDancers(
  supabase: SupabaseClient<Database>,
  dancers: Pick<
    Dancer,
    "id" | "projectId" | "name" | "color" | "initialDirection"
  >[],
): Promise<Dancer[]> {
  if (dancers.length === 0) return [];

  const { data, error } = await supabase
    .from("dancers")
    .insert(
      dancers.map((dancer) => ({
        id: dancer.id,
        project_id: dancer.projectId,
        name: dancer.name,
        color: dancer.color,
        initial_direction: dancer.initialDirection,
      })),
    )
    .select();

  if (error) throw error;
  return data.map(toDancer);
}

export async function updateDancerName(
  supabase: SupabaseClient<Database>,
  dancerId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("dancers")
    .update({ name })
    .eq("id", dancerId);

  if (error) throw error;
}

export async function updateDancerColor(
  supabase: SupabaseClient<Database>,
  dancerId: string,
  color: string,
): Promise<void> {
  const { error } = await supabase
    .from("dancers")
    .update({ color })
    .eq("id", dancerId);

  if (error) throw error;
}

export async function deleteDancer(
  supabase: SupabaseClient<Database>,
  dancerId: string,
): Promise<void> {
  const { error } = await supabase.from("dancers").delete().eq("id", dancerId);
  if (error) throw error;
}
