import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeGate } from "./WelcomeGate";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useUIStore } from "@/features/canvas/store/useUIStore";

/* WelcomeScreen はログインの板を開くために router を触る。
   jsdom には App Router が無いので、ここでは口だけ用意する */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

/** エディタ本体は重いので、ここでは「どちらが出ているか」だけを見る */
vi.mock("@/components/organisms/GuestEditor", () => ({
  GuestEditor: () => <div data-testid="guest-editor" />,
}));

function show() {
  render(
    <LocaleProvider locale="ja">
      <WelcomeGate />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  useUIStore.setState({ isGuestEditing: false });
});

describe("WelcomeGate", () => {
  it("最初は、始め方を選ぶ画面が出る", () => {
    show();

    expect(screen.getByText("ゲストで始める")).toBeInTheDocument();
    expect(screen.queryByTestId("guest-editor")).toBeNull();
  });

  it("案内の返事まで済ませると、エディタに入る", async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByText("ゲストで始める"));
    await user.click(screen.getByText("skip"));

    expect(screen.getByTestId("guest-editor")).toBeInTheDocument();
  });

  /* エディタのヘッダーの戻る矢印がここを false へ戻す。
     **押したあとタイトルへ戻る手段が無かった**（2026-08-20 の要望） */
  it("ストアを畳めば、始め方を選ぶ画面へ戻る", () => {
    useUIStore.setState({ isGuestEditing: true });
    show();
    expect(screen.getByTestId("guest-editor")).toBeInTheDocument();

    act(() => useUIStore.setState({ isGuestEditing: false }));

    expect(screen.getByText("ゲストで始める")).toBeInTheDocument();
    expect(screen.queryByTestId("guest-editor")).toBeNull();
  });
});
