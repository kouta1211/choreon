import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayModeMenu } from "./DisplayModeMenu";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { DEFAULT_PREFERENCE } from "@/features/theme/lib/themePreference";

const OVERRIDE_LABEL = "このプロジェクトだけ別の見た目";

/**
 * 見た目の上書きスイッチ。
 *
 * テーマそのものを選ぶ場所はホームのままで、ここに置いてあるのは
 * 「この1件を端末の既定から外すかどうか」だけ。上書きには対象の
 * プロジェクトが要るので、パスから読めるかどうかで出し分けている。
 */
describe("DisplayModeMenu の見た目の上書き", () => {
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

  it("プロジェクトを開いていれば、上書きスイッチを出す", async () => {
    window.history.pushState({}, "", "/projects/project-1");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));

    expect(screen.getByText(OVERRIDE_LABEL)).toBeInTheDocument();
  });

  it("下書き(ゲスト)では出さない。上書きの対象になるプロジェクトが無いため", async () => {
    window.history.pushState({}, "", "/");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));

    expect(screen.queryByText(OVERRIDE_LABEL)).not.toBeInTheDocument();
  });

  it("オンにすると、そのプロジェクトだけが上書き対象になる", async () => {
    window.history.pushState({}, "", "/projects/project-1");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));
    await user.click(screen.getByText(OVERRIDE_LABEL));

    expect(
      useThemeStore.getState().preference.byProject,
    ).toHaveProperty("project-1");
  });

  it("オフに戻すと上書きを消し、端末の既定へ戻す", async () => {
    window.history.pushState({}, "", "/projects/project-1");
    const user = userEvent.setup();

    render(<DisplayModeMenu />);
    await user.click(screen.getByLabelText("表示とモード"));
    await user.click(screen.getByText(OVERRIDE_LABEL));
    await user.click(screen.getByText(OVERRIDE_LABEL));

    expect(useThemeStore.getState().preference.byProject).toEqual({});
  });
});
