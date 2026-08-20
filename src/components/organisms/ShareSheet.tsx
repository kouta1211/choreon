"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import {
  rotateShareToken,
  updateProjectSharing,
} from "@/features/project/api/projects";
import { buildShareLink, copyToClipboard } from "@/features/project/lib/shareLink";
import { toUserMessage } from "@/lib/supabase/errors";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 共有リンクを配るシート。
 *
 * ■ 何を配っているのか
 * 「リンクを知っている人が、閲覧専用ビューアを開ける」だけです。
 * 相手はログインも要らず、編集の操作は持っていません(ビューアは
 * 編集のアクションを持たない別のストアで動いています)。
 *
 * ■ 曲は付いていかない
 * 音源はサーバーへ上げない方針なので、共有した相手の画面では
 * 8カウントの縞が地になります。相手が同じ曲を自分の端末で選べば
 * 波形になり、開始位置(music_offset_seconds)は共有されるので合います。
 * ここに一行書いておかないと、相手の画面で曲が鳴らないことを
 * 「壊れている」と受け取られる。
 *
 * ■ 個別リンクは権限ではない
 * `?p=` はポジションを選ぶ手間を省くだけで、書き換えれば他の人の道順も
 * 見られます。「この人にはこの人のぶんしか見せない」という仕組みでは
 * ないことを、配る側が誤解しないように書いてあります。
 *
 * ■ オン/オフのスイッチは外した(2026-08-17)
 * 「共有」を開いた人は配りたくて開いている。そこからもう一度スイッチを
 * 入れさせるのは、**押す前から答えの分かっている問い**でしかなかった
 * (「この導線の意味は？」という指摘はここ)。開いた時点でリンクを出し、
 * 逆向きの操作(共有をやめる)を下に置く形にしてある。
 *
 * やめても**鍵は作り直さない**ので、もう一度共有すると同じリンクが戻る。
 * 配った相手のリンクを恒久的に切るのは「リンクを作り直す」の役。
 */
export function ShareSheet({ project, isOpen, onClose }: Props) {
  const t = useT();
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  // 保存済みの値はstoreを唯一の置き場にする(プロジェクト名と同じ考え方)
  const stored = useProjectStore((state) =>
    state.project?.id === project.id ? state.project : project,
  );
  const setSharing = useProjectStore((state) => state.setSharing);
  const setShareToken = useProjectStore((state) => state.setShareToken);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = stored.shareToken
    ? buildShareLink({
        origin,
        projectId: project.id,
        shareToken: stored.shareToken,
      })
    : null;

  const copy = async (text: string, key: string) => {
    const copied = await copyToClipboard(text);
    if (!copied) {
      showToast({ message: t.share.copyFailed, type: "error" });
      return;
    }
    // 押したことが分かるのは、この画面では色の変化だけ。
    // トーストはシートの後ろに出るので、ここでは的の中で返す
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
  };

  const setSharingTo = (next: boolean) => {
    // 楽観的更新。リンクの表示がすぐ切り替わらないと、
    // 効いたのか分からないまま二度押しされる
    setSharing(next);

    void persist((supabase) =>
      updateProjectSharing(supabase, project.id, next),
    ).catch((error) => {
      setSharing(!next);
      showToast({
        message: toUserMessage(error, t.share.saveFailed),
        type: "error",
      });
    });
  };

  /* 開いたら、その場で共有を始める。
     **鍵がまだ無い作品では何もしない** — 出せるリンクが無いので、
     オンにしても「共有中なのにリンクが無い」という読めない状態になる。 */
  useEffect(() => {
    if (!isOpen || stored.isShared || !stored.shareToken) return;
    setSharingTo(true);
    // 開いた瞬間の一度だけ。stored.isShared を依存に入れると、
    // 「やめる」を押した直後にまた点いてしまう
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const rotate = () => {
    requestConfirm({
      title: t.share.regenerateTitle,
      description:
        t.share.regenerateDescription,
      confirmLabel: t.share.regenerateConfirm,
      onConfirm: async () => {
        try {
          const token = await persist((supabase) =>
            rotateShareToken(supabase, project.id),
          );
          if (token) setShareToken(token);
          showToast({ message: t.share.regenerated, type: "success" });
        } catch (error) {
          showToast({
            message: toUserMessage(error, t.share.regenerateFailed),
            type: "error",
          });
        }
      },
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t.share.title}>
      <div className="flex flex-col gap-gutter px-gutter py-gutter">
        {/* いまどの状態かを1行で。スイッチではなく状態の表示にしてある */}
        <p className="text-label leading-relaxed text-fg-sub">
          {stored.isShared ? t.share.enabledNote : t.share.disabledNote}
        </p>
        {!stored.shareToken && (
          <p className="rounded-lg border border-line px-gutter py-unit text-caption leading-snug text-fg-muted">
            {t.share.noKey}
          </p>
        )}
        {stored.shareToken && !stored.isShared && (
          <PressableButton
            kind="primary"
            onClick={() => setSharingTo(true)}
            className="h-target-lg w-full rounded-lg bg-accent text-body font-semibold text-accent-fg"
          >
            {t.share.resume}
          </PressableButton>
        )}

        {stored.isShared && link && (
          <>
            <div>
              <p className="mb-unit text-label text-fg-sub">
                {t.share.everyone}
              </p>
              {/* 作り直しは【リンクのすぐ隣】に置く(実機の要望 2026-08-20)。
                  離れた所に置くと、どのリンクを作り直すのか結び付かない */}
              <div className="flex items-center gap-unit">
                <span className="min-w-0 flex-1 truncate rounded-lg border border-line-strong bg-surface-strong px-gutter py-unit font-mono text-caption text-fg">
                  {link}
                </span>
                <PressableButton
                  kind="icon"
                  onClick={() => copy(link, "all")}
                  aria-label={t.share.copy}
                  className="flex h-target w-target shrink-0 items-center justify-center rounded-lg border border-line-strong text-fg-sub"
                >
                  {copiedKey === "all" ? (
                    <Check size={17} className="text-accent-soft" />
                  ) : (
                    <Copy size={17} />
                  )}
                </PressableButton>
                <PressableButton
                  kind="icon"
                  onClick={rotate}
                  aria-label={t.share.regenerate}
                  className="flex h-target w-target shrink-0 items-center justify-center rounded-lg border border-line-strong text-fg-muted"
                >
                  <RefreshCw size={16} />
                </PressableButton>
              </div>
            </div>

          </>
        )}
      </div>
    </BottomSheet>
  );
}
