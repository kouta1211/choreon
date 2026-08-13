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
      showToast({ message: "コピーできませんでした", type: "error" });
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
        message: toUserMessage(error, "共有の設定に失敗しました"),
        type: "error",
      });
    });
  };

  const rotate = () => {
    requestConfirm({
      title: "リンクを作り直しますか",
      description:
        "いま配ってあるリンクは、その場で開けなくなります。新しいリンクを配り直してください。",
      confirmLabel: "作り直す",
      onConfirm: async () => {
        try {
          const token = await persist((supabase) =>
            rotateShareToken(supabase, project.id),
          );
          if (token) setShareToken(token);
          showToast({ message: "新しいリンクにしました", type: "success" });
        } catch (error) {
          showToast({
            message: toUserMessage(error, "リンクを作り直せませんでした"),
            type: "error",
          });
        }
      },
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="共有">
      <div className="flex flex-col gap-4 px-3.5 py-3">
        <div>
          <Switch
            checked={stored.isShared}
            onChange={toggleSharing}
            label="リンクを知っている人が見られる"
            description={
              stored.isShared
                ? "リンクを開いた人は、見るだけの画面になります"
                : "オフの間は、リンクを持っていても開けません"
            }
            icon={Link2}
            fullWidth
          />
          {!stored.shareToken && (
            <p className="mt-2 rounded-xl border border-line px-3 py-2.5 text-[11px] leading-snug text-fg-muted">
              この作品にはまだ共有用の鍵がありません。
              <span className="font-mono"> 0007 </span>
              のマイグレーションを実行すると使えるようになります。
            </p>
          )}
        </div>

        {stored.isShared && link && (
          <>
            <div>
              <p className="mb-1.5 text-[12px] text-fg-sub">みんなに配るリンク</p>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate rounded-xl border border-line-strong bg-surface-strong px-3 py-2.5 font-mono text-[11px] text-fg">
                  {link}
                </span>
                <PressableButton
                  kind="icon"
                  onClick={() => copy(link, "all")}
                  aria-label="リンクをコピー"
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
                <p className="mb-1.5 text-[12px] text-fg-sub">
                  一人ひとりに配るリンク
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
                        className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left text-[13px] text-fg"
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
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-accent-soft">
                            <Check size={13} />
                            コピーしました
                          </span>
                        ) : (
                          <Copy size={15} className="shrink-0 text-fg-muted" />
                        )}
                      </PressableButton>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] leading-snug text-fg-muted">
                  開いた時点でその人が選ばれます。見られる範囲は同じで、
                  他の人の道順も見られます。
                </p>
              </div>
            )}

            <PressableButton
              onClick={rotate}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong text-[12.5px] text-fg-sub"
            >
              <RefreshCw size={15} />
              リンクを作り直す
            </PressableButton>
          </>
        )}

        <p className="text-[11px] leading-snug text-fg-muted">
          曲は付いていきません(音源はこの端末から出ないため)。相手の画面では
          8カウントの縞が地になり、同じ曲を相手の端末で選べば波形になります。
          曲の開始位置は共有されるので、選んでもらえれば位置は合います。
        </p>
      </div>
    </BottomSheet>
  );
}
