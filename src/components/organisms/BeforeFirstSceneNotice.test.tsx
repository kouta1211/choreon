import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BeforeFirstSceneNotice } from "./BeforeFirstSceneNotice";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { makeScene } from "@/test/factories";

/**
 * 曲が先に鳴っていて、まだ最初のシーンへ着いていない間の板。
 *
 * **出す / 出さない**は純粋関数（lib/beforeFirstScene）が決める。
 * ここで縛るのは【そこへ何を渡すか】と【隠せているか】。
 */
function setUp({
  hasMusic,
  currentTime,
}: {
  hasMusic: boolean;
  currentTime: number;
}) {
  useProjectStore.setState({
    scenes: [
      makeScene({ id: "scene-1", timeSeconds: 4 }),
      makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 8 }),
    ],
  });
  useMusicStore.setState({
    objectUrl: hasMusic ? "blob:song" : null,
    currentTime,
  });
  return render(<BeforeFirstSceneNotice />);
}

const notice = () => screen.queryByText("ここにはまだシーンがありません");

describe("BeforeFirstSceneNotice", () => {
  beforeEach(() => {
    useMusicStore.setState({ objectUrl: null, currentTime: 0 });
  });

  it("曲があり、最初のシーンより手前なら出す", () => {
    setUp({ hasMusic: true, currentTime: 2 });
    expect(notice()).toBeInTheDocument();
  });

  it("最初のシーンへ着いたら出さない", () => {
    setUp({ hasMusic: true, currentTime: 4 });
    expect(notice()).not.toBeInTheDocument();
  });

  it("曲が無ければ出さない（空のステージが自分の言葉で知らせる）", () => {
    setUp({ hasMusic: false, currentTime: 2 });
    expect(notice()).not.toBeInTheDocument();
  });

  /* ここが 2026-08-24 の user の指摘。幕を1枚かぶせるだけだと、
     **まだ誰も立っていないはずの隊形がうっすら見えていた**。
     舞台の地の色を塗り戻す面が要る */
  it("舞台の地の色で塗りつぶす面を敷く（人も方眼もここで沈む）", () => {
    const { container } = setUp({ hasMusic: true, currentTime: 2 });
    const ground = container.querySelector('[class*="bg-stage/"]');
    expect(ground).not.toBeNull();
  });

  it("その上に幕も重ねる（地よりもう一段沈ませる）", () => {
    const { container } = setUp({ hasMusic: true, currentTime: 2 });
    const veil = container.querySelector('[class*="--veil"]');
    expect(veil).not.toBeNull();
  });

  it("押す邪魔をしない（掴んで動かす操作は生きたまま）", () => {
    const { container } = setUp({ hasMusic: true, currentTime: 2 });
    expect(container.firstElementChild?.className).toContain(
      "pointer-events-none",
    );
  });
});
