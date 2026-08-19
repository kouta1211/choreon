import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stage } from "./Stage";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

describe("Stage", () => {
  it("デフォルトではグリッドが表示される", () => {
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid")).toBeInTheDocument();
  });

  it("gridModeがnoneのとき目盛りを一切表示しない", () => {
    useUIStore.setState({ gridMode: "none" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.queryByTestId("stage-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stage-concentric")).not.toBeInTheDocument();
  });

  it("gridModeがcircleのとき、格子ではなく同心円に差し替わる", () => {
    useUIStore.setState({ gridMode: "circle" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    // 両方出すと目盛りが二重になって読めないので、入れ替わることを確かめる
    expect(screen.getByTestId("stage-concentric")).toBeInTheDocument();
    expect(screen.queryByTestId("stage-grid")).not.toBeInTheDocument();
  });

  it("childrenを内側に描画する", () => {
    render(
      <Stage widthUnits={8} heightUnits={8}>
        <span>dancer</span>
      </Stage>,
    );
    expect(screen.getByText("dancer")).toBeInTheDocument();
  });

  it("誰かがフォーカスされている間はグリッドを暗くする", () => {
    useUIStore.setState({ focusedDancerId: "dancer-1" });
    render(<Stage widthUnits={8} heightUnits={8} />);
    expect(screen.getByTestId("stage-grid").className).toContain("opacity-40");
  });
});

/**
 * ステージの4辺の札。**枠に付いていること**が要点で、外側の入れ物に
 * 置くと縦に余る画面ほど離れていく（実機の報告 2026-08-19）。
 * 位置そのものは CSS なので jsdom では測れない。ここで縛るのは
 * 「枠の子であること」と「左右が入れ替わらないこと」。
 */
function renderStage() {
  render(
    <Stage widthUnits={8} heightUnits={8}>
      <div />
    </Stage>,
  );
  return screen.getByTestId("stage");
}

describe("ステージの4辺の札", () => {
  it("4つとも、ステージの枠の中に置かれている", () => {
    useSettingsStore.setState({ isAudienceOnTop: false });
    const frame = renderStage();

    for (const label of ["バックステージ", "客席側", "下手", "上手"]) {
      expect(frame.textContent).toContain(label);
    }
  });

  it("客席を上にすると、上下の札だけが入れ替わる", () => {
    useSettingsStore.setState({ isAudienceOnTop: true });
    const frame = renderStage();
    const labels = Array.from(frame.querySelectorAll("span"))
      .map((node) => node.textContent)
      .filter(
        (text) =>
          text && ["バックステージ", "客席側", "下手", "上手"].includes(text),
      );

    // 上（いちばん最初に置いてある札）が「客席側」に入れ替わる
    expect(labels[0]).toBe("客席側");
    expect(labels[1]).toBe("バックステージ");
    /* 左右は入れ替わらない。写すのは Y だけで X は動かさないため
       — ここが入れ替わると、上手と下手が逆の図を配ることになる */
    expect(labels[2]).toBe("下手");
    expect(labels[3]).toBe("上手");
  });
});
