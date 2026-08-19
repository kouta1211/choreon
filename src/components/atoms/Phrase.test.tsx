import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Phrase } from "./Phrase";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";

function renderIn(locale: "ja" | "en", text: string) {
  render(
    <LocaleProvider locale={locale}>
      <p data-testid="line">
        <Phrase>{text}</Phrase>
      </p>
    </LocaleProvider>,
  );
  return screen.getByTestId("line");
}

describe("Phrase", () => {
  it("日本語なら、文節の切れ目に折ってよい印を入れる", () => {
    const line = renderIn("ja", "移動が速すぎます");

    expect(line.querySelectorAll("wbr").length).toBeGreaterThan(0);
    // 文そのものは変わらない（読み上げもコピーも元のまま）
    expect(line.textContent).toBe("移動が速すぎます");
  });

  /* 英語は空白で切れる。印を足すとブラウザの判断より悪くなる */
  it("英語では何も足さない", () => {
    const line = renderIn("en", "Move is too fast");

    expect(line.querySelector("wbr")).toBeNull();
    expect(line.textContent).toBe("Move is too fast");
  });

  it("空文字でも落ちない", () => {
    const line = renderIn("ja", "");

    expect(line.textContent).toBe("");
  });
});
