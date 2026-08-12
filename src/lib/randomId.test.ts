import { afterEach, describe, expect, it, vi } from "vitest";
import { randomId } from "./randomId";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** セキュアコンテキストでないブラウザ(LANのIPで開いたスマートフォン)を再現する。
 * randomUUID だけが消え、getRandomValues は残るのが実際の挙動 */
function withoutRandomUUID() {
  const real = globalThis.crypto;
  vi.stubGlobal("crypto", {
    getRandomValues: real.getRandomValues.bind(real),
  });
}

describe("randomId", () => {
  it("UUID v4 の形を返す", () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it("randomUUID が使えない環境でも UUID v4 の形を返す", () => {
    withoutRandomUUID();
    expect(randomId()).toMatch(UUID_V4);
  });

  it("呼ぶたびに違う値を返す", () => {
    withoutRandomUUID();
    const ids = new Set(Array.from({ length: 200 }, () => randomId()));
    expect(ids.size).toBe(200);
  });
});
