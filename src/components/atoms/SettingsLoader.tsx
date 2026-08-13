"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { themeForScheme } from "@/features/settings/lib/colorScheme";
import { resolveAppearance } from "@/features/theme/lib/themePreference";

/**
 * 端末に覚えてある設定を、アプリが出た直後に1回だけ読む。画面には何も出さない。
 *
 * ■ なぜ設定画面ではなくここで読むのか
 * 格子の間隔やダンサー名の出し方は、設定画面を開いていないときにこそ効く。
 * 読み込みを設定シートのマウントに任せていたときは、一度シートを開くまで
 * 既定のまま描かれていた(=設定したはずのものが、次に開いたとき戻って見える)。
 *
 * localStorage はサーバーに無いので、最初の描画は必ず既定になる。
 * 見た目(data-theme)だけは一瞬でも既定が見えると分かるほど大きく変わるため、
 * layout.tsx の同期スクリプトが描画前に当てている。
 */
export function SettingsLoader() {
  const loadSettings = useSettingsStore((state) => state.load);
  const loadViewPreference = useUIStore((state) => state.loadViewPreference);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const colorScheme = useSettingsStore((state) => state.colorScheme);

  useEffect(() => {
    loadSettings();
    loadViewPreference();
    useThemeStore.getState().load();
  }, [loadSettings, loadViewPreference]);

  // 「端末に合わせる」を選んでいる間だけ、OSの明るさに追従する。
  // 暗い/明るいを自分で選んでいる人のテーマを、ここが上書きしてはいけない
  useEffect(() => {
    if (!isSettingsLoaded || colorScheme !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const { preference, projectId, setAppearance } = useThemeStore.getState();
      const current = resolveAppearance(preference, projectId).theme;
      const next = themeForScheme(current, "system", query.matches);
      if (next !== current) setAppearance({ theme: next });
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [isSettingsLoaded, colorScheme]);

  return null;
}
