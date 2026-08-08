import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project } from "@/features/project/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stageWidth: row.stage_width,
    stageHeight: row.stage_height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(
  supabase: SupabaseClient<Database>,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data.map(toProject);
}

export async function getProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data ? toProject(data) : null;
}

export async function updateProjectTitle(
  supabase: SupabaseClient<Database>,
  projectId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ title })
    .eq("id", projectId);

  if (error) throw error;
}

/**
 * dancers / scenes / positions は projects への外部キーが
 * `on delete cascade` なので、この1回の削除で関連データもまとめて消える
 * (アプリ側で順番に消して回る必要はない)
 */
export async function deleteProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}

export async function createProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
}
