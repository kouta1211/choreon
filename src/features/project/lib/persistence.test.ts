import { describe, expect, it, vi } from "vitest";
import { persist } from "./persistence";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { createGuestProject } from "@/features/project/lib/guestProject";

const supabaseStub = { from: () => ({}) };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseStub,
}));

function loadStore(isGuest: boolean) {
  const snapshot = createGuestProject();
  useProjectStore.getState().hydrate({ ...snapshot, isGuest });
}


describe("persist", () => {
  it("通常のプロジェクトではSupabaseへ渡して実行する", async () => {
    loadStore(false);
    const run = vi.fn().mockResolvedValue("保存済み");

    await expect(persist(run)).resolves.toBe("保存済み");
    expect(run).toHaveBeenCalledWith(supabaseStub);
  });

  it("ゲストの下書きでは何も実行しない", async () => {
    loadStore(true);
    const run = vi.fn();

    await expect(persist(run)).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("ゲストの下書きでは『未保存の変更あり』になる", async () => {
    loadStore(true);
    expect(useProjectStore.getState().hasUnsavedChanges).toBe(false);

    await persist(vi.fn());

    expect(useProjectStore.getState().hasUnsavedChanges).toBe(true);
  });

  it("通常のプロジェクトでは『未保存の変更あり』にしない", async () => {
    loadStore(false);
    await persist(vi.fn().mockResolvedValue(undefined));
    expect(useProjectStore.getState().hasUnsavedChanges).toBe(false);
  });

  it("保存に失敗したら例外はそのまま呼び出し側へ返す(ロールバックさせる)", async () => {
    loadStore(false);
    const run = vi.fn().mockRejectedValue(new Error("network"));

    await expect(persist(run)).rejects.toThrow("network");
  });

  it("クラウドへ保存した後は、以後の書き込みがSupabaseへ行く", async () => {
    loadStore(true);
    useProjectStore.getState().markSaved();
    const run = vi.fn().mockResolvedValue(undefined);

    await persist(run);

    expect(run).toHaveBeenCalledWith(supabaseStub);
    expect(useProjectStore.getState().hasUnsavedChanges).toBe(false);
  });
});
