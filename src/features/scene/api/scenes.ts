import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Scene } from "@/features/scene/types";
import {
  beatAtSeconds,
  durationBeats,
  durationSeconds,
  secondsAtBeat,
  withDerivedTimes,
  type Placement,
} from "@/features/music/lib/placement";

type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];

/**
 * 行から Scene を作る。**秒は派生値なので、ここでは作らない** —
 * 作るのは `withDerivedTimes` 1箇所だけ（下の `derive`）。
 *
 * `position_beats` が null なのは、**列を足す前に作られた行**か、
 * 移行の SQL を流していない DB。そのときは秒から逆算して埋める
 * （画面が真っ白になるより、少し古い物差しで動く方がよい）。
 */
function toBeated(
  row: SceneRow,
  placements: readonly Placement[],
): Omit<Scene, "timeSeconds" | "moveSeconds"> {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    orderIndex: row.order_index,
    positionBeats:
      row.position_beats ?? beatAtSeconds(placements, row.time_seconds),
    moveBeats:
      row.move_beats ??
      (row.move_seconds == null
        ? null
        : durationBeats(
            placements,
            row.position_beats ?? beatAtSeconds(placements, row.time_seconds),
            row.move_seconds,
          )),
  };
}

/** 行の並びを Scene の並びへ。**派生した秒はここで1回だけ載せる** */
function derive(rows: SceneRow[], placements: readonly Placement[]): Scene[] {
  return withDerivedTimes(
    rows.map((row) => toBeated(row, placements)),
    placements,
  );
}

export async function listScenes(
  supabase: SupabaseClient<Database>,
  projectId: string,
  /** その作品の載せ方。秒はここから導く */
  placements: readonly Placement[],
): Promise<Scene[]> {
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return derive(data, placements);
}

/**
 * 行に書く形。**移行の間は秒も一緒に書く**（dual write）。
 *
 * 読むのは拍の側だが、古い列を落とすまでは秒も埋めておく。そうしないと、
 * まだ古いアプリを開いている端末や、共有用の関数の `order by` が
 * 空の秒を見て並びを壊す。落とすのは、実データで食い違いが無いことを
 * 確かめてから別便で。
 */
function toRow(scene: Scene) {
  return {
    id: scene.id,
    project_id: scene.projectId,
    name: scene.name,
    order_index: scene.orderIndex,
    position_beats: scene.positionBeats,
    move_beats: scene.moveBeats ?? null,
    time_seconds: scene.timeSeconds,
    move_seconds: scene.moveSeconds ?? null,
  };
}

/** idは呼び出し側の楽観的更新と合わせるため、こちらで指定する(dancers.createDancerと同じ理由) */
export async function createScene(
  supabase: SupabaseClient<Database>,
  scene: Scene,
  placements: readonly Placement[],
): Promise<Scene> {
  const { data, error } = await supabase
    .from("scenes")
    .insert(toRow(scene))
    .select()
    .single();

  if (error) throw error;
  return derive([data], placements)[0];
}

/** 複数シーンをまとめて作る。ゲストの下書きをクラウドへ移すときに使う
 * (1シーンずつ作ると往復が増えるだけなので、createDancersと同じ扱い) */
export async function createScenes(
  supabase: SupabaseClient<Database>,
  scenes: Scene[],
  placements: readonly Placement[],
): Promise<Scene[]> {
  if (scenes.length === 0) return [];

  const { data, error } = await supabase
    .from("scenes")
    .insert(scenes.map(toRow))
    .select();

  if (error) throw error;
  return derive(data, placements);
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

/**
 * シーンの位置をまとめて書き戻す。
 * 1つ動かすと隣も動くこと(リップル)があるので、常に複数件で受ける。
 *
 * **拍でしか受け付けない。** 秒を受ける形にしておくと、呼び出し側の
 * どれかが換算を忘れても型が通ってしまう（呼ぶ所が4つある）。
 * 秒は移行の間だけ、ここで拍から作って一緒に書く。
 */
export async function updateSceneBeats(
  supabase: SupabaseClient<Database>,
  beats: { id: string; positionBeats: number }[],
  placements: readonly Placement[],
): Promise<void> {
  if (beats.length === 0) return;

  // 1件ずつのupdateを並べる。upsertにすると、他の列(name/order_index)を
  // 送らないぶんが既定値で上書きされてしまう
  const results = await Promise.all(
    beats.map(({ id, positionBeats }) =>
      supabase
        .from("scenes")
        .update({
          position_beats: positionBeats,
          time_seconds: secondsAtBeat(placements, positionBeats),
        })
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

/**
 * 複数のシーンをまとめて消す。1つずつ delete すると件数ぶん往復することに
 * なるため、1回のリクエストにまとめる（`deleteDancers` と同じ考え方）。
 * 配置はシーンへの外部キーで連鎖して消える（schema.sql 参照）。
 */
export async function deleteScenes(
  supabase: SupabaseClient<Database>,
  sceneIds: string[],
): Promise<void> {
  if (sceneIds.length === 0) return;

  const { error } = await supabase.from("scenes").delete().in("id", sceneIds);
  if (error) throw error;
}

/** そのシーンの「動くのに使う拍数」。null なら区間まるごとへ戻す。
 *  秒は移行の間だけ、拍から作って一緒に書く */
export async function updateSceneMoveBeats(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  moveBeats: number | null,
  /** そのシーンの位置。区間の長さを差で出すのに要る */
  positionBeats: number,
  placements: readonly Placement[],
): Promise<void> {
  const { error } = await supabase
    .from("scenes")
    .update({
      move_beats: moveBeats,
      move_seconds:
        moveBeats == null
          ? null
          : durationSeconds(placements, positionBeats, moveBeats),
    })
    .eq("id", sceneId);

  if (error) throw error;
}
