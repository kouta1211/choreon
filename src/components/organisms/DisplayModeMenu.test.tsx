import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayModeMenu } from "./DisplayModeMenu";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { DEFAULT_PREFERENCE } from "@/features/theme/lib/themePreference";

const OVERRIDE_LABEL = "このプロジェクトだけ別の見た目";

/**
 * 見た目の上書きスイッチは**ここから外した**(2026-08-17)。
 *
 * 2026-08-10 に一度「到達できないUIを残さない」として消したものが戻って
 * いて、また「この機能いらない」という指摘をもらった。2度出た答えなので、
 * **戻ってきたら気づけるように**テストを消さずに向きを変えてある。
 *
 * 保存の形(byProject)と解決の順は残してあるので、既に上書きを持っている
 * 人の作品はこれまでどおりその見た目で開く。そのための知らせ手
 * (setProjectId)も残っていることを一緒に見る。
 */
describe("DisplayModeMenu と見た目の上書き", () => {
  beforeEach(() => {
    // このストアはvitest.setupの初期化対象に入っていないので自分で戻す
    useThemeStore.setState({
      preference: DEFAULT_PREFERENCE,
      projectId: null,
      isLoaded: false,
    });
    localStorage.clear();
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("プロジェクトを開いていても、上書きスイッチは出さない", async () => {
    window.history.pushState({}, "", "/projects/project-1");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));

    expect(screen.queryByText(OVERRIDE_LABEL)).not.toBeInTheDocument();
  });

  it("下書き(ゲスト)でも出さない", async () => {
    window.history.pushState({}, "", "/");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));

    expect(screen.queryByText(OVERRIDE_LABEL)).not.toBeInTheDocument();
  });

  // 既に上書きを持っている人の作品を、その見た目のまま開くために要る
  it("開いているプロジェクトは、これまでどおりテーマ側へ知らせる", async () => {
    window.history.pushState({}, "", "/projects/project-1");

    render(<DisplayModeMenu />);

    expect(useThemeStore.getState().projectId).toBe("project-1");
  });
});
