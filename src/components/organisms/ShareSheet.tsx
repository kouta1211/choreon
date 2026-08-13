"use client";

import { useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Switch } from "@/components/atoms/Switch";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import {
  rotateShareToken,
  updateProjectSharing,
} from "@/features/project/api/projects";
import { buildShareLink, copyToClipboard } from "@/features/project/lib/shareLink";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
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
 */
export function ShareSheet({ project, isOpen, onClose }: Props) {
  const t = useT();
  const showToast = useUIStore((state) => state.showToast);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const dancers = useProjectStore((state) => state.dancers);

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

  const toggleSharing = () => {
    const next = !stored.isShared;
    // 楽観的更新。リンクの表示がすぐ切り替わらないと、
    // オンにしたのか分からないまま二度押しされる
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
      <div className="flex flex-col gap-4 px-3.5 py-3">
        <div>
          <Switch
            checked={stored.isShared}
            onChange={toggleSharing}
            label={t.share.enable}
            description={
              stored.isShared
                ? t.share.enabledNote
                : t.share.disabledNote
            }
            icon={Link2}
            fullWidth
          />
          {!stored.shareToken && (
            <p className="mt-2 rounded-xl border border-line px-3 py-2.5 text-caption leading-snug text-fg-muted">
              {t.share.noKey}
              <span className="font-mono"> 0007 </span>
              {t.share.noKeyMigration}
            </p>
          )}
        </div>

        {stored.isShared && link && (
          <>
            <div>
              <p className="mb-1.5 text-label text-fg-sub">
                {t.share.everyone}
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate rounded-xl border border-line-strong bg-surface-strong px-3 py-2.5 font-mono text-caption text-fg">
                  {link}
                </span>
                <PressableButton
                  kind="icon"
                  onClick={() => copy(link, "all")}
                  aria-label={t.share.copy}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong text-fg-sub"
                >
                  {copiedKey === "all" ? (
                    <Check size={17} className="text-accent-soft" />
                  ) : (
                    <Copy size={17} />
                  )}
                </PressableButton>
              </div>
            </div>

            {Object.keys(dancers).length > 0 && (
              <div>
                <p className="mb-1.5 text-label text-fg-sub">
                  {t.share.perDancer}
                </p>
                <ul className="flex flex-col gap-1">
                  {Object.values(dancers).map((dancer) => (
                    <li key={dancer.id}>
                      <PressableButton
                        onClick={() =>
                          copy(
                            buildShareLink({
                              origin,
                              projectId: project.id,
                              shareToken: stored.shareToken as string,
                              dancerId: dancer.id,
                            }),
                            dancer.id,
                          )
                        }
                        className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left text-label text-fg"
                      >
                        <span
                          aria-hidden
                          style={{ background: themedDancerColor(dancer.color) }}
                          className="block h-2 w-2 shrink-0 rounded-full"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {dancer.name}
                        </span>
                        {copiedKey === dancer.id ? (
                          <span className="flex shrink-0 items-center gap-1 text-caption text-accent-soft">
                            <Check size={13} />
                            {t.share.copied}
                          </span>
                        ) : (
                          <Copy size={15} className="shrink-0 text-fg-muted" />
                        )}
                      </PressableButton>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-caption leading-snug text-fg-muted">
                  {t.share.perDancerNote}

                </p>
              </div>
            )}

            <PressableButton
              onClick={rotate}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong text-label text-fg-sub"
            >
              <RefreshCw size={15} />
              {t.share.regenerate}
            </PressableButton>
          </>
        )}

        <p className="text-caption leading-snug text-fg-muted">
          {t.share.musicNote}
          8カウントの縞が地になり、同じ曲を相手の端末で選べば波形になります。

        </p>
      </div>
    </BottomSheet>
  );
}
