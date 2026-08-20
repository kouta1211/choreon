import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "./AuthForm";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import * as authApi from "@/features/auth/api/auth";

vi.mock("@/features/auth/api/auth", () => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

function show(overrides: Partial<Parameters<typeof AuthForm>[0]> = {}) {
  const onModeChange = vi.fn();
  const onAuthenticated = vi.fn();
  render(
    <LocaleProvider locale="ja">
      <AuthForm
        mode="login"
        onModeChange={onModeChange}
        onAuthenticated={onAuthenticated}
        {...overrides}
      />
    </LocaleProvider>,
  );
  return { onModeChange, onAuthenticated };
}

async function fillAndSubmit(label: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("メールアドレス"), "a@example.com");
  await user.type(screen.getByLabelText(/パスワード/), "hunter22");
  await user.click(screen.getByRole("button", { name: label }));
}

beforeEach(() => {
  /* jsdom の window.isSecureContext は既定で false。そのままだと
     「安全でない接続」の枠が出て、送信そのものが止まる（本番は https か
     localhost なので true）。ここを立てないと、何を試しても無反応になる */
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  vi.mocked(authApi.signInWithPassword).mockReset();
  vi.mocked(authApi.signUpWithPassword).mockReset();
});

describe("AuthForm", () => {
  it("入れたら、そのユーザーで次へ進む", async () => {
    vi.mocked(authApi.signInWithPassword).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as unknown as Awaited<ReturnType<typeof authApi.signInWithPassword>>);
    const { onAuthenticated } = show();

    await fillAndSubmit("ログイン");

    expect(onAuthenticated).toHaveBeenCalledWith("user-1");
  });

  /* 読み上げにも届くよう role="alert" で出す。ここが無いと、目で見て
     いない人には「押しても何も起きない」ことになる */
  it("入れなかったら、その場に理由を出す", async () => {
    vi.mocked(authApi.signInWithPassword).mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    } as unknown as Awaited<ReturnType<typeof authApi.signInWithPassword>>);
    const { onAuthenticated } = show();

    await fillAndSubmit("ログイン");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "メールアドレスまたはパスワードが正しくありません。",
    );
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("下の行から、新規登録へ切り替えられる", async () => {
    const { onModeChange } = show();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新規登録" }));

    expect(onModeChange).toHaveBeenCalledWith("signup");
  });

  it("登録に失敗したら、既に登録済みかどうかで文を分ける", async () => {
    vi.mocked(authApi.signUpWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    } as unknown as Awaited<ReturnType<typeof authApi.signUpWithPassword>>);
    show({ mode: "signup" });

    await fillAndSubmit("登録する");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "このメールアドレスは既に登録されています。",
    );
  });

  it("確認メールを送ったら、入力欄ごと案内に差し替える", async () => {
    vi.mocked(authApi.signUpWithPassword).mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof authApi.signUpWithPassword>>);
    show({ mode: "signup" });

    await fillAndSubmit("登録する");

    expect(await screen.findByText("確認メールを送信しました。")).toBeInTheDocument();
    expect(screen.queryByLabelText("メールアドレス")).toBeNull();
  });
});
