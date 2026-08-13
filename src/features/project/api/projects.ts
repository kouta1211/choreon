import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Project, ProjectSummary } from "@/features/project/types";
import { listPositionsByScenes } from "@/features/scene/api/positions";
import { totalSeconds } from "@/features/scene/lib/sceneTiming";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stageWidth: row.stage_width,
    stageHeight: row.stage_height,
    // migration 0003 を当てる前のDBには、この列がまだ無い。undefinedのまま
    // 通すと秒数の計算がNaNになり、曲を鳴らしていなくてもシーンの選択が
    // おかしくなる。既定値(0)はDB側のdefaultと同じなので、無ければ0に落とす
    musicOffsetSeconds: row.music_offset_seconds ?? 0,
    // migration 0005 を当てる前のDBには、この2つの列がまだ無い。
    // 既定値はDB側のdefaultと同じ
    bpm: (row as { bpm?: number }).bpm ?? DEFAULT_BPM,
    beatsPerBar: (row as { beats_per_bar?: number }).beats_per_bar ?? 4,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 曲の速さ(BPM)を保存する。
 *
 * migration 0005 を当てていないDBでは列が無く、Supabaseが
 * 「そんな列は無い」(PGRST204)を返す。BPMは端末側の表示にもう反映されて
 * いるので、その1件だけは【黙って流す】。ここで例外にすると、
 * マイグレーション前のDBでスライダーを触るたびにエラーが出る。
 */
export async function updateProjectBpm(
  supabase: SupabaseClient<Database>,
  projectId: string,
  bpm: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    // 列がまだ無いDBがあるため、型定義から外れる書き込みになる
    .update({ bpm } as never)
    .eq("id", projectId);

  if (error && error.code !== "PGRST204") throw error;
}

/** 曲の開始オフセット(秒)を保存する。曲そのものは端末側にしか無いので、
 * ここで保存するのは「何秒目から始めるか」だけ */
export async function updateMusicOffset(
  supabase: SupabaseClient<Database>,
  projectId: string,
  musicOffsetSeconds: number,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ music_offset_seconds: musicOffsetSeconds })
    .eq("id", projectId);

  if (error) throw error;
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
      "*, scenes(id, order_index, time_seconds), dancers(id, color, created_at)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  type Row = ProjectRow & {
    scenes: {
      id: string;
      order_index: number;
      time_seconds: number;
    }[];
    dancers: { id: string; color: string; created_at: string }[];
  };
  const rows = (data ?? []) as Row[];

  // 並び順の正は時刻。エディタ側(sortScenes)と同じ規則で並べないと、
  // カードのサムネイルが「先頭のシーン」ではなくなる
  const scenesByProject = rows.map((row) => ({
    projectId: row.id,
    scenes: [...(row.scenes ?? [])].sort(
      (a, b) => a.time_seconds - b.time_seconds || a.order_index - b.order_index,
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

    // 作品の長さは【先頭から最後のシーンまで】。
    // 以前は transition_duration_seconds(前のシーンから来るのに何秒か)を
    // 足し上げていたが、時刻が正になった今この列はもう更新されない。
    // 足し上げたままだと、追加したシーンがすべて既定値(1秒)で数えられ、
    // 一覧のカードだけが実際と違う長さを出すことになる
    const total = totalSeconds(
      scenes.map((scene) => ({ id: scene.id, timeSeconds: scene.time_seconds })),
    );

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

/**
 * 1件取ってくる。見えなければ null。
 *
 * ■ 「権限が無い」も null として扱う
 * ログインしていない相手には、RLS で行が絞られる前に GRANT の段で
 * 弾かれ、42501(insufficient_privilege)の例外になる。これをそのまま
 * 投げると、404 で済むはずのところが 500 になる。500 は
 * 「その先に何かある」ことを教えてしまううえ、画面にもエラーが出る。
 *
 * 呼び出し側から見れば「見えない」ことに変わりはないので、
 * どちらも null にして notFound() へ落とす。
 */
export async function getProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return null;
    throw error;
  }
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
      // 頭出しが既定(0)のままなら、この列を送らない。DB側のdefaultも0なので
      // 保存される値は変わらず、migration 0003 を当てる前のDBでも
      // 下書きの保存が通る。頭出しを設定した下書きを保存する場合だけは
      // 列が要るので、そのときは素直に送って失敗させる
      // (黙って捨てると、設定したはずの位置が次に開いたとき消えている)
      ...(project.musicOffsetSeconds > 0
        ? { music_offset_seconds: project.musicOffsetSeconds }
        : {}),
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
