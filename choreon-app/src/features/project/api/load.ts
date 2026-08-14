import type { Database } from '@/lib/supabase/database.types';
import type { Dancer } from '@/features/dancer/types';
import type { Project } from '@/features/project/types';
import type { Position, Scene } from '@/features/scene/types';
import { supabase } from '@/lib/supabase/client';

/**
 * 自分の作品を **読むだけ** のための入口。
 *
 * ■ なぜ読むだけなのか
 * ネイティブ版はまだ実機で1周も確認していない。ここから書き込みを通すと、
 * 確認できていないコードが **user の本物の作品を書き換える**。読むのは
 * 何度失敗しても失うものが無いので、まず読む方だけを通す。
 * 画面側も「この端末での変更は保存されません」と出している。
 *
 * ■ Web版の api/ をまるごとコピーしなかった理由
 * あちらは書き込み（upsert・delete）が同じファイルに同居している。
 * 持ってくると「呼んでいないだけで、いつでも書ける」状態になる。
 * 行→アプリの形の変換（下の to〜）は Web版から**そのまま写した**ので、
 * 読めるデータの解釈はずれない。
 */

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type DancerRow = Database['public']['Tables']['dancers']['Row'];
type SceneRow = Database['public']['Tables']['scenes']['Row'];
type PositionRow = Database['public']['Tables']['positions']['Row'];

/** 一覧に出すぶんだけ。中身（シーン・ダンサー）は開いてから読む */
export type ProjectListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stageWidth: row.stage_width,
    stageHeight: row.stage_height,
    // 列を足す前のスキーマのままのDBには、この列がまだ無い。undefined を
    // 通すと秒数の計算が NaN になる（Web版 projects.ts と同じ落とし方）
    musicOffsetSeconds: row.music_offset_seconds ?? 0,
    bpm: row.bpm ?? 120,
    beatsPerBar: row.beats_per_bar ?? 4,
    shareToken: row.share_token ?? null,
    isShared: row.is_shared ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

function toScene(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    orderIndex: row.order_index,
    timeSeconds: row.time_seconds,
  };
}

function toPosition(row: PositionRow): Position {
  return {
    sceneId: row.scene_id,
    dancerId: row.dancer_id,
    xCoordinate: row.x_coordinate,
    yCoordinate: row.y_coordinate,
    rotationAngle: row.rotation_angle,
    dancerTransitionDurationSeconds: row.dancer_transition_duration_seconds,
    curveControlX: row.curve_control_x,
    curveControlY: row.curve_control_y,
  };
}

/**
 * 自分の作品の一覧。新しく触ったものが上。
 *
 * RLS で「自分の行しか見えない」ので、ここで user_id を指定していない。
 * 未ログインなら anon には権限が無く、空で返る（エラーにはしない）。
 */
export async function listMyProjects(): Promise<ProjectListItem[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

export type LoadedProject = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

/**
 * 作品1件を丸ごと読む。
 *
 * 立ち位置はシーンの id で引くので、シーンを読んでからでないと引けない。
 * それ以外（作品・ダンサー・シーン）は互いに関係が無いので同時に投げる。
 */
export async function loadProject(projectId: string): Promise<LoadedProject | null> {
  const [projectResult, dancerResult, sceneResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
    supabase
      .from('dancers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
  ]);

  for (const result of [projectResult, dancerResult, sceneResult]) {
    // 42501 = 権限が無い。RLS では「他人の作品」も「存在しない」も
    // 見え方が同じなので、どちらも「無い」として扱う（Web版 getProject と同じ）
    if (result.error && result.error.code !== '42501') throw result.error;
  }
  if (!projectResult.data) return null;

  const scenes = (sceneResult.data ?? []).map(toScene);
  const sceneIds = scenes.map((scene) => scene.id);

  let positions: Position[] = [];
  if (sceneIds.length > 0) {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .in('scene_id', sceneIds);
    if (error) throw error;
    positions = (data ?? []).map(toPosition);
  }

  return {
    project: toProject(projectResult.data),
    dancers: (dancerResult.data ?? []).map(toDancer),
    scenes,
    positions,
  };
}
