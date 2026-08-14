import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  deleteProject,
  insertProject,
  listProjectTitles,
} from "@/features/project/api/projects";
import { nextAvailableTitle } from "@/features/project/lib/projectTitle";
import { createDancers } from "@/features/dancer/api/dancers";
import { createScenes } from "@/features/scene/api/scenes";
import { upsertPositions } from "@/features/scene/api/positions";
import {
  withFreshIds,
  type ProjectSnapshot,
} from "@/features/project/lib/guestProject";
import type { Project } from "@/features/project/types";

/**
 * ゲストの下書き(Zustandの中身)を、まるごとクラウドへ保存する。
 *
 * 順番は projects → dancers / scenes → positions。positionsが
 * scene_id・dancer_idの両方を外部キーで参照しているため、この順でしか
 * 入れられない。dancersとscenesは互いに無関係なので同時に投げてよい。
 *
 * PostgRESTからは複数テーブルをまたぐトランザクションを張れないので、
 * 途中で失敗したらプロジェクトを削除して丸ごと無かったことにしている
 * (dancers / scenes / positions の外部キーは on delete cascade なので、
 * この1回の削除で中身も消える)。中途半端に一部だけ残るのが最悪なので、
 * 「全部入るか、何も残らないか」に寄せた。
 *
 * IDは保存の直前に採り直す(withFreshIds)。下書きのIDは固定値のため、
 * そのまま入れると2回目の保存で主キーが衝突する。
 *
 * 名前も同じ理由でここで見る。この道は【ファイルからの取り込み】も通り
 * (useProjectData)、取り込みは常に新しい作品として作るので、同じファイルを
 * 2回取り込むと同じ名前が2つ並ぶ。既にある名前なら (2)、(3) と番号を足す。
 */
export async function saveGuestProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  snapshot: ProjectSnapshot,
): Promise<Project> {
  const fresh = withFreshIds(snapshot, userId);
  const title = nextAvailableTitle(
    await listProjectTitles(supabase, userId),
    fresh.project.title,
  );

  const project = await insertProject(supabase, { ...fresh.project, title });

  try {
    await Promise.all([
      createDancers(supabase, fresh.dancers),
      createScenes(supabase, fresh.scenes),
    ]);
    await upsertPositions(supabase, fresh.positions);
  } catch (error) {
    // 後片付け自体が失敗しても、報告すべきは元の失敗の方
    await deleteProject(supabase, project.id).catch(() => {});
    throw error;
  }

  return project;
}
