import { afterEach, describe, expect, it } from "vitest";
import { resolveContextMenuTarget } from "@/features/canvas/lib/contextMenuTarget";

/**
 * 素の DOM だけで組む。ここは React も Zustand も要らない判定なので、
 * 板ごと描かずに確かめられる（そのために切り出した）。
 */
function build(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("resolveContextMenuTarget", () => {
  it("ダンサーの中で押されたら、その人を返す", () => {
    const root = build(`
      <div data-testid="stage">
        <div data-dancer-id="dancer-1"><span class="body"></span></div>
      </div>
    `);
    const inner = root.querySelector(".body");

    expect(resolveContextMenuTarget(inner)).toEqual({
      kind: "dancer",
      dancerId: "dancer-1",
    });
  });

  it("ステージの面の上なら「地」", () => {
    const root = build(
      '<div data-testid="stage"><div class="grid"></div></div>',
    );

    expect(resolveContextMenuTarget(root.querySelector(".grid"))).toEqual({
      kind: "stage",
    });
  });

  /* ステージの下に並ぶボタンは、枠のすぐ下へ絶対配置しているので
     **DOM の上ではステージ面の中に居る**。ここを弾かないと、
     元に戻すボタンの上で押しても地のメニューが出る */
  it("ステージ面の中にあるボタンの上では、何も返さない", () => {
    const root = build(`
      <div data-testid="stage">
        <button type="button"><span class="label">元に戻す</span></button>
      </div>
    `);

    expect(resolveContextMenuTarget(root.querySelector(".label"))).toBeNull();
  });

  it("リンクと入力欄も、それぞれの持ち主に譲る", () => {
    const root = build(`
      <div data-testid="stage">
        <a href="#" class="link">共有</a>
        <input class="field" />
      </div>
    `);

    expect(resolveContextMenuTarget(root.querySelector(".link"))).toBeNull();
    expect(resolveContextMenuTarget(root.querySelector(".field"))).toBeNull();
  });

  it("ダンサーの上にボタンが乗っていたら、ボタンが勝つ", () => {
    const root = build(`
      <div data-testid="stage">
        <div data-dancer-id="dancer-1">
          <button type="button" class="handle"></button>
        </div>
      </div>
    `);

    expect(resolveContextMenuTarget(root.querySelector(".handle"))).toBeNull();
  });

  it("ステージの外なら、何も返さない", () => {
    const root = build('<div class="outside"></div>');

    expect(resolveContextMenuTarget(root.querySelector(".outside"))).toBeNull();
  });

  it("要素でないものが来ても落ちない", () => {
    expect(resolveContextMenuTarget(null)).toBeNull();
    expect(resolveContextMenuTarget(new EventTarget())).toBeNull();
  });
});
