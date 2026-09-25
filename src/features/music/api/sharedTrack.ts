import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildSharedTrackPath,
  sharedTrackContentType,
} from "@/features/music/lib/sharedTrack";

/**
 * **共有する曲の置き場への出入り**（2026-09-25）。
 *
 * ここだけが Supabase Storage に触る。道の作り方と大きさの線引きは
 * `lib/sharedTrack.ts`（純粋関数）にあるので、こちらは通信だけ。
 *
 * ■ 誰が読めるかはここでは決めていない
 * バケットは**非公開**で、門番は `storage.objects` の RLS
 * （`supabase/schema.sql` の「5. Storage」）。
 * - 持ち主 … 自分の作品のフォルダだけ CRUD できる
 * - 見る人（ログインしていない） … **その作品が共有中なら** 読めるだけ
 *
 * だから署名URLも service_role の鍵も要らない。**共有をやめた瞬間に
 * 読めなくなる**のが、この形を選んだ理由（署名URLだと取り消せない）。
 *
 * ⚠️ 非公開バケットなので、`<audio src={リモートURL}>` では鳴らせない。
 * `<audio>` は Authorization ヘッダを付けられないため、**いったん
 * 丸ごと落としてから** Blob を鳴らす（`downloadSharedTrack`）。
 */

export const MUSIC_BUCKET = "music";

/**
 * 上げる。返すのは**置いた道**で、呼び出し側がそれを
 * `projects.music_path` へ書く。
 *
 * ⚠️ **列を書くのは上げ切ってから**。先に書くと、上げに失敗したときに
 * 「道はあるのに実体が無い」作品ができる。
 */
export async function uploadSharedTrack(
  supabase: SupabaseClient<Database>,
  projectId: string,
  file: File,
): Promise<string> {
  const path = buildSharedTrackPath(projectId, file.name);

  const { error } = await supabase.storage.from(MUSIC_BUCKET).upload(path, file, {
    /* **形は自分で決めて渡す。** 既定では `file.type` がそのまま使われ、
       Android が空で返した曲は `text/plain` として上がってバケットに
       弾かれる（`sharedTrackContentType` の説明）*/
    contentType: sharedTrackContentType(file.name, file.type),
    // 道は毎回ランダムなので、上書きが起きること自体が無い
    upsert: false,
  });

  if (error) throw error;
  return path;
}

/**
 * 消す。
 *
 * ⚠️ **先に `projects.music_path` を null にしてから呼ぶ**。
 * 判定（`is_shared_music_object`）は列と道を突き合わせているので、
 * 列さえ変われば**消し損ねても古い音は届かない**。逆順だと、
 * 消せなかったときに前の曲が鳴り続ける。
 */
export async function removeSharedTrack(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(MUSIC_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * 落とす。**見る人の端末から、ログインせずに呼ぶ。**
 *
 * 通るかどうかは RLS が決める（共有をやめた作品なら弾かれる）。
 */
export async function downloadSharedTrack(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(MUSIC_BUCKET)
    .download(path);

  if (error) throw error;
  if (!data) throw new Error("曲を受け取れませんでした");
  return data;
}
