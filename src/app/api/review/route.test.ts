import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { FormationSummary } from "@/features/review/lib/formationSummary";
import type { PieceSummary } from "@/features/review/lib/pieceSummary";

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

/**
 * 上流が返す1件ぶん。
 *
 * 断りのときは `text()` と `clone()` も要る — **相手の言い分を控える**
 * ようにしたため（原因の分からない断りで本番を3往復した反省）。
 */
function upstream(text: string, status = 200) {
  const body = JSON.stringify({ error: { message: `upstream said ${status}` } });
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

  /** 429 はこちらの使いすぎ、503 は相手の混雑。待つ理由が違うので分ける */
  it("回数の上限に当たったときは、そう言う", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 429)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const data = (await (await POST(request())).json()) as { error: string };

    expect(data.error).toContain("回数の上限");
  });

  it("相手が混み合っているときは、そう言う", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream("", 503)));
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

/**
 * 作品ぜんぶを見てもらう側。
 *
 * 口は1つのまま（鍵・ログイン・打ち切り・断りの文言は共通）で、
 * **何を渡してどう濾すか**だけが違う。ここで見るのはその分岐。
 */
const PIECE: PieceSummary = {
  sceneCount: 2,
  totalSeconds: 4,
  dancerNames: ["8", "2"],
  scenes: [
    {
      number: 1,
      name: "出",
      timeSeconds: 0,
      segmentSeconds: null,
      dancerCount: 2,
      spreadX: 6,
      spreadY: 0,
      centreX: 0,
      centreY: 0,
      facts: { hiddenDancers: [], fastMoves: [] },
    },
    {
      number: 2,
      name: "サビ",
      timeSeconds: 4,
      segmentSeconds: 4,
      dancerCount: 2,
      spreadX: 0,
      spreadY: 4,
      centreX: 0,
      centreY: -2,
      facts: { hiddenDancers: ["8"], fastMoves: [] },
    },
  ],
};

function pieceRequest(piece: PieceSummary = PIECE): Request {
  return new Request("http://localhost/api/review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ piece }),
  });
}

const PIECE_REPLY = JSON.stringify({
  summary: "散りの変化は付いています",
  findings: [
    {
      sceneNumber: 2,
      tone: "watch",
      text: "サビで8番が隠れます",
      fixKind: "clearBlindSpot",
      fixDancerName: "8",
    },
  ],
});

describe("POST /api/review（作品ぜんぶ）", () => {
  it("シーン番号付きの指摘を返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream(PIECE_REPLY)));

    const data = (await (await POST(pieceRequest())).json()) as {
      review: { findings: { sceneNumber?: number; fix: unknown }[] };
    };

    expect(data.review.findings[0].sceneNumber).toBe(2);
    expect(data.review.findings[0].fix).toEqual({
      kind: "clearBlindSpot",
      dancerName: "8",
    });
  });

  /** 1シーンぶんとは違う指示・違う型を渡している */
  it("流れを見る指示と、番号付きの型で頼む", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream(PIECE_REPLY));
    vi.stubGlobal("fetch", fetchMock);

    await POST(pieceRequest());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      systemInstruction: { parts: { text: string }[] };
      contents: { parts: { text: string }[] }[];
      generationConfig: { responseSchema: { properties: { findings: unknown } } };
    };
    expect(body.systemInstruction.parts[0].text).toContain("並びと流れ");
    // 全シーンが1行ずつ入っている
    expect(body.contents[0].parts[0].text).toContain("1. 「出」");
    expect(body.contents[0].parts[0].text).toContain("2. 「サビ」");
    // 型に sceneNumber がある
    expect(
      JSON.stringify(body.generationConfig.responseSchema),
    ).toContain("sceneNumber");
  });

  /** シーンを取り違えた直しは、関係の無い場面を壊す */
  it("そのシーンの事実に無い直しは、落とす", async () => {
    const wrongScene = JSON.stringify({
      summary: "",
      findings: [
        {
          // 8番の顔被りは2番のシーンの話
          sceneNumber: 1,
          tone: "watch",
          text: "出で8番が隠れます",
          fixKind: "clearBlindSpot",
          fixDancerName: "8",
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream(wrongScene)));

    const data = (await (await POST(pieceRequest())).json()) as {
      review: { findings: { fix: unknown }[] };
    };

    expect(data.review.findings[0].fix).toBeNull();
  });

  it("誰も置いていない作品は、送る前に断る", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      pieceRequest({
        ...PIECE,
        scenes: PIECE.scenes.map((scene) => ({ ...scene, dancerCount: 0 })),
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("シーンが空の作品も、送る前に断る", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(pieceRequest({ ...PIECE, scenes: [] }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * 崩れた返事を、そのまま画面へ出さない。
 *
 * ■ 実機報告 16-7
 * 作品ぜんぶを見てもらったら、画面に
 * `{"summary":"…","findings":[{"sceneNumber":0,…` がそのまま出た。
 * 「形が崩れていても読める文章は手元にある」として本文を出していたが、
 * **型付きで頼んだ返事が崩れると JSON の破片になる**。読める文章どころか、
 * user から見れば故障の跡。
 *
 * 原因は上限（考えるぶんに食われて途中で切れた）。上限は上げたが、
 * **切れても画面へ出さない**方の守りも要る。
 */
describe("崩れた返事", () => {
  const cutOffJson =
    '{"summary":"同じ配置が続きます","findings":[{"sceneNumber":0,"tone":"good","text":"途中で';

  it("型付きで頼んで崩れていたら、断りとして返す（生の JSON を出さない）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream(cutOffJson)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(pieceRequest());
    const data = (await response.json()) as { error?: string; text?: string };

    expect(response.status).toBe(502);
    expect(data.error).toContain("途中で切れました");
    // 破片が画面へ渡らないこと
    expect(JSON.stringify(data)).not.toContain("sceneNumber");
  });

  /** 型なしの返事（梯子の下段）は素の文章なので、これまでどおり出す */
  it("型なしで返ってきた文章は、そのまま出す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(upstream("", 400))
      .mockResolvedValueOnce(upstream("綺麗に並んでいます"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const data = (await (await POST(pieceRequest())).json()) as {
      review: { summary: string };
    };

    expect(data.review.summary).toBe("綺麗に並んでいます");
  });

  it("上限に余裕を持たせて頼む", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream(PIECE_REPLY));
    vi.stubGlobal("fetch", fetchMock);

    await POST(pieceRequest());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      generationConfig: { maxOutputTokens: number };
    };
    // 2000 では作品ぜんぶの返事が途中で切れた（実機報告 16-7）
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(2000);
  });
});
