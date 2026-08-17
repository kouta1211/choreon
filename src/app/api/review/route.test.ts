import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { FormationSummary } from "@/features/review/lib/formationSummary";

/**
 * 見てもらう口のテスト。
 *
 * ■ なぜここにテストを書くのか
 * このルートは **3回**、実機でしか分からない形で止まっている
 *   1. モデルが停止していた（404 → 「診断が取れませんでした」だけが出た）
 *   2. 上限を考えるぶんに食われて、文の途中で切れた返事が返った
 *   3. 上限を上げたら、こんどは待ち時間の打ち切りに引っかかった
 * どれも「画面からは原因が分からない」形で、直すのに実機で2往復した。
 * **手元に GEMINI_API_KEY は無いので本物は呼べない**が、上流の返事の形を
 * 差し替えれば、こちら側の枝はここで全部通せる。
 *
 * 見ているのは主に、上流が型付きの依頼を断ったときに**機能を1段落として
 * 続けられるか**。ここが効かないと、診断がまた丸ごと死ぬ。
 */
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/features/i18n/server", () => ({
  getLocale: async () => "ja",
}));

const SUMMARY: FormationSummary = {
  sceneName: "シーン1",
  timeSeconds: 0,
  segmentSeconds: null,
  dancers: [{ name: "8", x: 0, y: -4, facing: 0 }],
  facts: { hiddenDancers: ["8"], fastMoves: [] },
};

function request(): Request {
  return new Request("http://localhost/api/review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ summary: SUMMARY }),
  });
}

/** 上流が返す1件ぶん */
function upstream(text: string, status = 200) {
  return {
    ok: status === 200,
    status,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    }),
  };
}

const STRUCTURED = JSON.stringify({
  summary: "奥の列が重なっています",
  findings: [
    {
      tone: "watch",
      text: "8番が隠れます",
      fixKind: "clearBlindSpot",
      fixDancerName: "8",
    },
  ],
});

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/review", () => {
  it("指摘に分解して返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream(STRUCTURED)));

    const data = (await (await POST(request())).json()) as {
      review: { summary: string; findings: { fix: unknown }[] };
    };

    expect(data.review.summary).toBe("奥の列が重なっています");
    expect(data.review.findings[0].fix).toEqual({
      kind: "clearBlindSpot",
      dancerName: "8",
    });
  });

  /** スマホ用アプリは text だけを見ている。黙って空にしない */
  it("畳んだ文章も一緒に返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream(STRUCTURED)));

    const data = (await (await POST(request())).json()) as { text: string };

    expect(data.text).toBe("奥の列が重なっています\n- 8番が隠れます");
  });

  /**
   * ★ここが本題。型付きの依頼を断られても、診断そのものは死なせない。
   * 手元では本物を呼べないので、この枝は**ここだけが確認の場**になる。
   */
  it("型を断られたら、型なしで呼び直して文章を出す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(upstream("", 400))
      .mockResolvedValueOnce(upstream("綺麗に並んでいます"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());
    const data = (await response.json()) as {
      text: string;
      review: { summary: string; findings: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(data.review.summary).toBe("綺麗に並んでいます");
    // 分解できないのでボタンは付かない。読める講評は出る
    expect(data.review.findings).toEqual([]);

    // 2回目は型を外して送っている
    const [, second] = fetchMock.mock.calls;
    const body = JSON.parse(second[1].body as string) as {
      generationConfig: Record<string, unknown>;
    };
    expect(body.generationConfig.responseSchema).toBeUndefined();
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it("呼び直しても断られたら、断りとして返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 400)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(502);
  });

  /** 待っても直らないもの / 待てば直るものは、文言で分ける */
  it("モデルが見つからないときは、設定の直しが要ると言う", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 404)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const data = (await (await POST(request())).json()) as { error: string };

    expect(data.error).toContain("設定の直し");
  });

  it("混み合っているときは、待てば直ると言う", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 429)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const data = (await (await POST(request())).json()) as { error: string };

    expect(data.error).toContain("混み合って");
  });

  it("時間内に返らなければ、時間の話として返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("timeout"), { name: "TimeoutError" }),
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const data = (await (await POST(request())).json()) as { error: string };

    expect(data.error).toContain("時間がかかりすぎ");
  });

  it("誰も居ないシーンは、送る前に断る", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/review", {
        method: "POST",
        body: JSON.stringify({ summary: { ...SUMMARY, dancers: [] } }),
      }),
    );

    expect(response.status).toBe(400);
    // 上流を呼んでいない（料金も待ち時間も使わない）
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
