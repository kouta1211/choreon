"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { updateProjectMetronome } from "@/features/project/api/projects";
import { toUserMessage } from "@/lib/supabase/errors";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * メトロノーム(クリック)を鳴らすか。
 *
 * ■ 端末ではなく作品が持つ(2026-08-18、実機の要望)
 * 以前は端末ごとの設定(localStorage)だったので、**共有リンクで見る人には
 * 引き継げなかった**。「振付師が決めたとおりに見える」を成り立たせるため、
 * 作品の設定へ移した。音源そのものは共有しないが、クリックは BPM と拍子から
 * 合成できるので共有できる。
 *
 * 保存の形は速さ(useBpm)と同じ —
 * 【楽観的に変える → 保存 → 失敗したら戻してトーストを出す】。
 */
export function useMetronomeSetting(): {
  isMetronomeEnabled: boolean;
  toggleMetronome: () => void;
} {
  const t = useT();
  const isMetronomeEnabled = useProjectStore(
    (state) => state.project?.isMetronomeEnabled ?? false,
  );
  const applyMetronome = useProjectStore((state) => state.setMetronome);
  const showToast = useUIStore((state) => state.showToast);

  const toggleMetronome = () => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const next = !project.isMetronomeEnabled;
    applyMetronome(next);

    void persist((supabase) =>
      updateProjectMetronome(supabase, project.id, next),
    ).catch((error) => {
      applyMetronome(!next);
      showToast({
        message: toUserMessage(error, t.editor.errors.metronome),
        type: "error",
      });
    });
  };

  return { isMetronomeEnabled, toggleMetronome };
}
