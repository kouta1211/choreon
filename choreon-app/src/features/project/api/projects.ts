import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import type { Project } from '@/features/project/types';
import { nextAvailableTitle } from '@/features/project/lib/projectTitle';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

/**
 * 作品そのものを**書き換える**ための入口。読む方は `load.ts` にある。
 *
 * ■ 読みと書きを別のファイルに分けてある
 * ネイティブ版を作り始めたとき、Web版の api/ を丸ごとコピーせずに
 * 「読む3つだけ」を写した（持ってくると、呼んでいないだけでいつでも
 * 書ける状態になるため）。書き込みを通す段になったので、こちらを足した。
 * **分かれたままにしておくと、どちらの口を使っているかが import で分かる。**
 *
 * 行→アプリの形の変換は Web版 projects.ts からそのまま写している。
 */
function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    stageWidth: row.stage_width,
    stageHeight: row.stage_height,
    musicOffsetSeconds: row.music_offset_seconds ?? 0,
    bpm: row.bpm ?? 120,
    beatsPerBar: row.beats_per_bar ?? 4,
    shareToken: row.share_token ?? null,
    isShared: row.is_shared ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * その人の作品の名前だけを読む。ぶつからない名前を決めるためにだけ使う
 * （一覧の描画には `listMyProjects`）。
 */
export async function listProjectTitles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('title')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.title);
}

/**
 * 新しい作品を作る。
 *
 * ステージの広さと速さは【設定の初期値】を受け取る。作品が持つ値なので、
 * 一度作ったあとは作品側が正で、設定を変えても既存の作品は動かない。
 *
 * 同じ名前が既にあれば (2)、(3) … と番号を足す（`nextAvailableTitle`）。
 * 付いた番号は返り値の title に入っているので、呼び出し側はそれを見て
 * 「名前を変えた」と伝えられる。
 */
export async function createProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string,
  defaults?: { stageWidth: number; stageHeight: number; bpm: number },
): Promise<Project> {
  const uniqueTitle = nextAvailableTitle(await listProjectTitles(supabase, userId), title);

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: uniqueTitle,
      ...(defaults
        ? {
            stage_width: defaults.stageWidth,
            stage_height: defaults.stageHeight,
            bpm: defaults.bpm,
          }
        : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
}

export async function updateProjectTitle(
  supabase: SupabaseClient<Database>,
  projectId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase.from('projects').update({ title }).eq('id', projectId);
  if (error) throw error;
}

/**
 * dancers / scenes / positions は projects への外部キーが
 * `on delete cascade` なので、**この1回の削除で関連データもまとめて消える**
 * （アプリ側で順番に消して回る必要はない）。
 */
export async function deleteProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

/**
 * 既に手元にあるもの（ゲストの下書き・取り込んだファイル）をそのまま登録する。
 *
 * `createProject` と違って id とステージの広さも指定する。下書きの側で
 * 既にそれらが決まっていて、シーン・ダンサーもその id を参照しているため。
 */
export async function insertProject(
  supabase: SupabaseClient<Database>,
  project: Project,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: project.id,
      user_id: project.userId,
      title: project.title,
      stage_width: project.stageWidth,
      stage_height: project.stageHeight,
      // 頭出しが既定(0)のままなら、この列を送らない。DB側のdefaultも0なので
      // 保存される値は変わらず、この列がまだ無い古いDBでも下書きの保存が通る
      ...(project.musicOffsetSeconds > 0
        ? { music_offset_seconds: project.musicOffsetSeconds }
        : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return toProject(data);
}
