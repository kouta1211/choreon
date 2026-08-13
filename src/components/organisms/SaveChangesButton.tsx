"use client";

import { useState } from "react";
import { Check, CloudUpload } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { flushPendingWrites } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { PressableButton } from "@/components/atoms/PressableButton";

/**
 * 自動保存を切っているときだけ出る「保存」。
 *
 * 自動保存が入っているあいだ、この場所には何も出さない。押せる保存が
 * 常にあると「押さないと消えるのでは」と、要らない不安を毎回抱かせる
 * (SaveToCloudButton と同じ考え方)。
 *
 * 押すまでの間、変更は画面には出ているがまだ送られていない。その状態を
 * 点で添えるのも、ゲストの保存ボタンと揃えてある。
 */
export function SaveChangesButton() {
  const isGuest = useProjectStore((state) => state.isGuest);
  const hasUnsavedChanges = useProjectStore((state) => state.hasUnsavedChanges);
  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.isAutoSaveEnabled,
  );
  const showToast = useUIStore((state) => state.showToast);
  const [isSaving, setIsSaving] = useState(false);

  // ゲストの下書きは、そもそもクラウドに置き場所が無い。
  // あちらの入口は SaveToCloudButton(登録の壁)
  if (isGuest || isAutoSaveEnabled) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await flushPendingWrites();
    } catch (error) {
      showToast({
        message: toUserMessage(error, "保存に失敗しました"),
        type: "error",
        action: { label: "再試行", onAction: () => void handleSave() },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PressableButton
      kind="primary"
      onClick={() => void handleSave()}
      disabled={isSaving}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-2xl bg-accent pr-3 pl-2.5 text-label font-semibold text-accent-fg disabled:opacity-50"
    >
      {hasUnsavedChanges ? <CloudUpload size={15} /> : <Check size={15} />}
      {hasUnsavedChanges ? "保存" : "保存済み"}
    </PressableButton>
  );
}
