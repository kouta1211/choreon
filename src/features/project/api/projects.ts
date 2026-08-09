import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project, ProjectSummary } from "@/features/project/types";
import { listPositionsByScenes } from "@/features/scene/api/positions";

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

/**
 * 一覧のカードに出す要約つきでプロジェクトを取得する。
 *
 * クエリは2本で済ませている。1本目でプロジェクトと、その配下のシーン・
 * ダンサーを入れ子で取り、2本目で「各プロジェクトの先頭シーン」の配置だけを
 * まとめて取る。プロジェクトごとに問い合わせるとN+1になるため、
 * 先頭シーンのIDを集めてから1回で引いている。
 *
 * 合計秒数は先頭シーンのぶんを含めない(先頭には入ってくる元が無いため)。
 */
export async function listProjectSummaries(
  supabase: SupabaseClient<Database>,
): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "*, scenes(id, order_index, transition_duration_seconds), dancers(id, color, created_at)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  type Row = ProjectRow & {
    scenes: {
      id: string;
      order_index: number;
      transition_duration_seconds: number;
    }[];
    dancers: { id: string; color: string; created_at: string }[];
  };
  const rows = (data ?? []) as Row[];

  const scenesByProject = rows.map((row) => ({
    projectId: row.id,
    scenes: [...(row.scenes ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    ),
  }));
  const firstSceneIds = scenesByProject
    .map((entry) => entry.scenes[0]?.id)
    .filter((id): id is string => id !== undefined);

  const positions =
    firstSceneIds.length > 0
      ? await listPositionsByScenes(supabase, firstSceneIds)
      : [];
  const positionsBySceneId = new Map<string, typeof positions>();
  for (const position of positions) {
    const list = positionsBySceneId.get(position.sceneId) ?? [];
    list.push(position);
    positionsBySceneId.set(position.sceneId, list);
  }

  return rows.map((row, index) => {
    const scenes = scenesByProject[index].scenes;
    const dancers = [...(row.dancers ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const colorByDancerId = new Map(dancers.map((d) => [d.id, d.color]));
    const firstScenePositions = (
      positionsBySceneId.get(scenes[0]?.id ?? "") ?? []
    ).flatMap((position) => {
      const color = colorByDancerId.get(position.dancerId);
      if (!color) return [];
      return [
        {
          xCoordinate: position.xCoordinate,
          yCoordinate: position.yCoordinate,
          color,
        },
      ];
    });

    const total = scenes
      .slice(1)
      .reduce((sum, scene) => sum + scene.transition_duration_seconds, 0);

    return {
      ...toProject(row),
      sceneCount: scenes.length,
      dancerCount: dancers.length,
      totalSeconds: Math.round(total * 10) / 10,
      dancerColors: dancers.map((dancer) => dancer.color),
      firstScenePositions,
    };
  });
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

/**
 * 既に手元にあるプロジェクト(ゲストの下書き)をそのまま登録する。
 *
 * createProjectと違ってidとステージの広さも指定する。下書きの側で
 * 既にそれらが決まっていて、シーン・ダンサーもそのidを参照しているため
 */
export async function insertProject(
  supabase: SupabaseClient<Database>,
  project: Project,
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: project.id,
      user_id: project.userId,
      title: project.title,
      stage_width: project.stageWidth,
      stage_height: project.stageHeight,
    })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
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
