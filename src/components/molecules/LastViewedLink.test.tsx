import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LastViewedLink } from "./LastViewedLink";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { LAST_VIEWED_STORAGE_KEY } from "@/features/viewer/lib/lastViewed";

function renderLink() {
  render(
    <LocaleProvider locale="ja">
      <LastViewedLink />
    </LocaleProvider>,
  );
}

function remember(value: unknown) {
  localStorage.setItem(LAST_VIEWED_STORAGE_KEY, JSON.stringify(value));
}

afterEach(() => localStorage.clear());

describe("LastViewedLink", () => {
  it("控えが無ければ何も出さない(戻る先が無いことを説明しない)", () => {
    renderLink();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("控えてある共有リンクへの戻り道を出す", () => {
    remember({ path: "/view/abc?t=xyz", title: "夏の作品" });
    renderLink();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/view/abc?t=xyz");
    expect(link.textContent).toContain("夏の作品");
  });

  /* localStorage は書き換えられる。よそのホストへ飛ばす入口にしない */
  it("よそのURLが書き込まれていたら出さない", () => {
    remember({ path: "//evil.example/view/abc", title: "わな" });
    renderLink();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("壊れた控えでも落ちない", () => {
    localStorage.setItem(LAST_VIEWED_STORAGE_KEY, "{ではない");
    renderLink();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
