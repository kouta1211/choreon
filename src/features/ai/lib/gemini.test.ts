import { afterEach, describe, expect, it, vi } from "vitest";
import { callGemini, failureMessage } from "./gemini";

/**
 * AI を呼ぶところ。
 *
 * ■ なぜここを手厚くするのか
 * **手元では本物を呼べない**（GEMINI_API_KEY は本番にしか無い）。
 * この制約のせいで、原因の分からないまま本番を4回往復している
 * （モデル停止 → 上限切れ → 打ち切り → 操作の口が読めない）。
 * 上流の返事の形を差し替えれば、こちら側の枝はここで全部通せる。
 *
 * 見ているのは主に**断られたときの梯子**。一度に全部を諦めず、
 * 1段ずつ落ちていくこと。ここが効かないと、上流の仕様が少し変わるだけで
 * 機能が丸ごと死ぬ。
 */
const ERRORS = {
  modelMissing: "相手が見つかりません",
  rejected: "鍵が断られました",
  busy: "混み合っています",
  unavailable: "うまくいきませんでした",
  tooSlow: "時間がかかりすぎました",
  empty: "返事が空でした",
};

function upstream(text: string, status = 200, complaint = "だめです") {
  const body = JSON.stringify({ error: { message: complaint } });
  const response = {
    ok: status === 200,
    status,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    }),
    text: async () => body,
    clone: () => response,
  };
  return response;
}

/** 各回の generationConfig を覗く */
function configsOf(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls.map(
    (call) =>
      (
        JSON.parse((call[1] as { body: string }).body) as {
          generationConfig: Record<string, unknown>;
        }
      ).generationConfig,
  );
}

const CALL = {
  apiKey: "test-key",
  label: "test",
  systemPrompt: "指示",
  userText: "頼み事",
  schema: { type: "OBJECT" },
  errors: ERRORS,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("callGemini の梯子", () => {
  it("通れば、型ありのまま返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream('{"ok":1}'));
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGemini({ ...CALL, thinkingLevel: "low" });

    expect(result).toMatchObject({ ok: true, wasStructured: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [first] = configsOf(fetchMock);
    expect(first.responseSchema).toBeDefined();
    expect(first.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  /** ★一度に全部を諦めない。考える量を断られても、型は捨てない */
  it("考える量の指定を断られたら、それだけ外す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(upstream("", 400, "thinkingLevel は使えません"))
      .mockResolvedValueOnce(upstream('{"ok":1}'));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini({ ...CALL, thinkingLevel: "low" });

    expect(result).toMatchObject({ ok: true, wasStructured: true });
    const [, second] = configsOf(fetchMock);
    expect(second.thinkingConfig).toBeUndefined();
    // 型は残っている
    expect(second.responseSchema).toBeDefined();
  });

  it("型も断られたら、素の文章で受ける", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(upstream("", 400))
      .mockResolvedValueOnce(upstream("", 400))
      .mockResolvedValueOnce(upstream("綺麗に並んでいます"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini({ ...CALL, thinkingLevel: "low" });

    expect(result).toMatchObject({
      ok: true,
      text: "綺麗に並んでいます",
      wasStructured: false,
    });
    const [, , third] = configsOf(fetchMock);
    expect(third.responseSchema).toBeUndefined();
    expect(third.thinkingConfig).toBeUndefined();
  });

  /** 渡していないものは段にしない。無駄な往復を増やさない */
  it("考える量を渡していなければ、段は2つ", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(upstream("", 400))
      .mockResolvedValueOnce(upstream("文章"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await callGemini(CALL);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("最後まで断られたら、断りとして返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 400)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini({ ...CALL, thinkingLevel: "low" });

    expect(result).toMatchObject({ ok: false, status: 502 });
  });

  /** ★上流の言い分を持ち帰る。これが無いと本番を何往復もすることになる */
  it("上流の言い分を持ち帰る", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(upstream("", 503, "高負荷です")),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini(CALL);

    expect(result).toMatchObject({
      ok: false,
      upstream: { status: 503, message: "高負荷です" },
    });
  });

  /** 鍵は塗り潰す（相手は返さないが、余地を残さない） */
  it("言い分に鍵が混ざっていたら塗り潰す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(upstream("", 400, "key=test-key は無効です")),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini({ ...CALL, schema: undefined });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.upstream?.message).toBe("key=<KEY> は無効です");
    }
  });

  it("上限で切られたら、そうと分かるように返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: "途中で" }] }, finishReason: "MAX_TOKENS" },
          ],
        }),
        text: async () => "",
        clone() {
          return this;
        },
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callGemini(CALL);

    expect(result).toMatchObject({ ok: true, wasTruncated: true });
  });

  it("上限は呼ぶ側が決められる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await callGemini({ ...CALL, maxOutputTokens: 8000 });

    expect(configsOf(fetchMock)[0].maxOutputTokens).toBe(8000);
  });
});

describe("failureMessage", () => {
  /** 待っても直らないもの / 待てば直るものを、文言で分ける */
  it("こちらの直しが要るものと、待てば直るものを分ける", () => {
    expect(failureMessage(404, ERRORS)).toBe(ERRORS.modelMissing);
    expect(failureMessage(403, ERRORS)).toBe(ERRORS.rejected);
    expect(failureMessage(429, ERRORS)).toBe(ERRORS.busy);
    // 503「高負荷です」も待てば直る。本番でこれが「うまくいきませんでした」
    // と出て、待てばよいのか分からなかった
    expect(failureMessage(503, ERRORS)).toBe(ERRORS.busy);
    expect(failureMessage(500, ERRORS)).toBe(ERRORS.unavailable);
  });
});
