"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { updateMusicPath } from "@/features/project/api/projects";
import {
  removeSharedTrack,
  uploadSharedTrack,
} from "@/features/music/api/sharedTrack";
import { loadTrack } from "@/features/music/lib/musicStorage";
import {
  shareTrackBlocker,
  type ShareTrackBlocker,
} from "@/features/music/lib/sharedTrack";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * **曲も一緒に配る / やめる**（2026-09-25）。
 *
 * ■ なぜ `persist()` を通さないのか
 * あちらは**自動保存を切っている間、書き込みを貯める**。曲は実体を先に
 * 上げてしまうので、列だけ貯まると「音源はサーバーにあるのに、作品は
 * それを指していない」状態になる。見る人には何も鳴らず、誰にも理由が
 * 見えない。ここは**押したその場で確定する**操作（リンクの作り直しと
 * 同じ性質）なので、素の `createClient()` で書く。
 * ゲストでは作品の行そのものが無いので、そもそも押せない
 * （`shareTrackBlocker` が止める）。
 *
 * ■ 順番が意味を持つ
 * - 配る … **上げ切ってから**列を書く。逆だと、失敗したときに
 *   「道はあるのに実体が無い」作品ができる
 * - やめる … **列を null にしてから**実体を消す。判定
 *   （`is_shared_music_object`）は列と道を突き合わせているので、
 *   列さえ変われば**消し損ねても古い音は届かない**
 */
export function useSharedTrack(projectId: string) {
  const t = useT();
  const isGuest = useProjectStore((state) => state.isGuest);
  const musicPath = useProjectStore(
    (state) => state.project?.musicPath ?? null,
  );
  const setMusicPath = useProjectStore((state) => state.setMusicPath);
  const showToast = useUIStore((state) => state.showToast);

  /** この端末にある音源の大きさ。曲のシートで選んだ実体を見る */
  const [localBytes, setLocalBytes] = useState<number | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  /* 大きさは実体を見ないと分からない。シートを開いたときに1回だけ読む */
  const refreshLocalSize = async () => {
    const stored = await loadTrack(projectId);
    setLocalBytes(stored ? stored.file.size : null);
  };

  const blocker: ShareTrackBlocker | null = shareTrackBlocker({
    isGuest,
    fileSizeBytes: localBytes,
  });

  const attach = async () => {
    const stored = await loadTrack(projectId);
    if (!stored) return;

    setIsWorking(true);
    try {
      const supabase = createClient();
      const path = await uploadSharedTrack(supabase, projectId, stored.file);
      // 上げ切ってから列を書く
      await updateMusicPath(supabase, projectId, path);
      setMusicPath(path);
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.share.musicUploadFailed),
        type: "error",
      });
    } finally {
      setIsWorking(false);
    }
  };

  const detach = async () => {
    if (!musicPath) return;

    setIsWorking(true);
    try {
      const supabase = createClient();
      // 先に列。ここが通った時点で、もう誰にも届かない
      await updateMusicPath(supabase, projectId, null);
      setMusicPath(null);
      await removeSharedTrack(supabase, musicPath);
    } catch (error) {
      showToast({
        message: toUserMessage(error, t.share.musicUploadFailed),
        type: "error",
      });
    } finally {
      setIsWorking(false);
    }
  };

  return {
    /** サーバーに置いてあるか */
    isShared: musicPath !== null,
    /** 配れない理由。配れるなら null */
    blocker,
    /** この端末にある音源の大きさ（バイト）。無ければ null */
    localBytes,
    isWorking,
    refreshLocalSize,
    attach,
    detach,
  };
}
