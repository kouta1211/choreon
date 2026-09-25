/**
 * **曲をサーバーへ置くときの決まりごと**（2026-09-25）。
 *
 * 音源はもともと端末の IndexedDB にしか無く、共有リンクを開いた人には
 * 鳴らなかった（user の報告「共有をしたのですが、曲が聞こえません」）。
 * **共有のシートで押したときだけ**サーバーへ置く、という形にした。
 *
 * ■ ここには通信を書かない
 * 置き場の道の作り方・大きさの線引き・上げられない理由の判定だけを持つ。
 * Supabase を呼ぶのは `features/music/api/sharedTrack.ts`、
 * 画面は `ShareSheet`。分けてあるので、境目までテストで縛れる。
 */

import { randomId } from "@/lib/randomId";

/**
 * 1曲の上限（20MB）。**バケット側にも同じ数を入れてある**
 * （`supabase/schema.sql` の `file_size_limit`）ので、ここだけ緩めても通らない。
 *
 * 5分の曲は MP3 で 7MB 前後、高音質でも 15MB ほど。WAV（5分で 52MB）は
 * 通らないが、あれは配るための形ではない。
 */
export const MAX_SHARED_TRACK_BYTES = 20 * 1024 * 1024;

/**
 * 置き場の道を作る。`<projectId>/<ランダム>.<拡張子>`。
 *
 * ⚠️ **ファイル名を使わない。** 名前には個人名や公演名が入る
 * （`shared_project` が `music_title` を返さないのと同じ理由）。
 * 道は見る人へ渡るので、そこから読めるものが増えてはいけない。
 *
 * 拡張子だけは残す。ブラウザや端末が形を見分ける手がかりになるうえ、
 * 拡張子そのものからは何も読めない。
 */
export function buildSharedTrackPath(
  projectId: string,
  fileName: string,
): string {
  const extension = extensionOf(fileName);
  return `${projectId}/${randomId()}${extension}`;
}

/** `song.mp3` → `.mp3`。無ければ空文字（拡張子が無いファイルもある） */
function extensionOf(fileName: string): string {
  const matched = /\.([a-zA-Z0-9]{1,8})$/.exec(fileName.trim());
  return matched ? `.${matched[1].toLowerCase()}` : "";
}

/**
 * 上げるときに名乗る形（MIME）。
 *
 * ⚠️ **ブラウザの `file.type` を信じ切らない**。Android の選択画面は
 * `.wav` や `.m4a` を**空の形**で返すことがある（`MusicSheet` の
 * `accept` に拡張子を並べてあるのは、同じ話で困ったため）。
 * 空のまま上げると `text/plain` として送られ、バケットの
 * `allowed_mime_types` に弾かれる — **編集画面では普通に鳴っていた曲が、
 * 共有のときだけ理由も分からず失敗する**という壊れ方になる。
 */
export function sharedTrackContentType(
  fileName: string,
  fileType: string,
): string {
  if (fileType.startsWith("audio/")) return fileType;

  const byExtension: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".webm": "audio/webm",
  };
  return byExtension[extensionOf(fileName)] ?? "audio/mpeg";
}

/**
 * **なぜ配れないか**。配れるなら `null`。
 *
 * 画面（`ShareSheet`）に条件を書かず、ここへ集める。書くと、文言を直す
 * ときに片方だけ直って、押せないのに理由が出ない状態が作れる。
 */
export type ShareTrackBlocker =
  /** まだ保存していない作品。作品の行が無いので、持ち主の判定ができない */
  | "guest"
  /** この端末に音源が無い（別の端末で入れた曲）。上げる実体が手元に無い */
  | "missing"
  /** 大きすぎる */
  | "tooLarge";

export function shareTrackBlocker({
  isGuest,
  fileSizeBytes,
}: {
  isGuest: boolean;
  /** この端末にある音源の大きさ。無ければ `null` */
  fileSizeBytes: number | null;
}): ShareTrackBlocker | null {
  if (isGuest) return "guest";
  if (fileSizeBytes === null) return "missing";
  if (fileSizeBytes > MAX_SHARED_TRACK_BYTES) return "tooLarge";
  return null;
}

/** `8.2MB` の形。理由を出すときに、実物の大きさを添えるため */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  // 1MB 未満は 0.1MB 刻みでは 0.0 になるので、そこだけ細かく出す
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${Math.round(mb * 10) / 10}MB`;
}
