import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NarrowScreenGate } from "./NarrowScreenGate";

const pathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/organisms/NarrowScreenNotice", () => ({
  NarrowScreenNotice: () => <div data-testid="narrow-notice" />,
}));

function show(path: string) {
  pathname.mockReturnValue(path);
  render(<NarrowScreenGate />);
}

/**
 * 狭い幅の案内を、画面をまたいで1回だけ出す。
 * **幅そのものは CSS で見ている**ので、ここで見るのは経路だけ。
 */
describe("NarrowScreenGate", () => {
  it.each([
    ["トップ", "/"],
    ["作成画面", "/projects/abc"],
    ["ログイン", "/login"],
    ["新規登録", "/signup"],
  ])("作る側の画面では出す（%s）", (_label, path) => {
    show(path);

    expect(screen.getByTestId("narrow-notice")).toBeInTheDocument();
  });

  /* ここだけは狭い幅が主戦場。出したら、見る人が何もできなくなる */
  it.each([
    ["共有リンク", "/view/abc"],
    ["合鍵つき", "/view/abc/"],
  ])("見る側では出さない（%s）", (_label, path) => {
    show(path);

    expect(screen.queryByTestId("narrow-notice")).toBeNull();
  });

  /* /viewer や /views のような、たまたま前方が一致するだけの経路で
     消えてしまわないこと */
  it("名前が似ているだけの経路では出す", () => {
    show("/viewer");

    expect(screen.getByTestId("narrow-notice")).toBeInTheDocument();
  });
});
