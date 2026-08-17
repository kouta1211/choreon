import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seekFreshAudio } from "./seekAudio";

/**
 * 作りたての `<audio>` を、狙った秒数へ送る。
 *
 * ■ 何のための用心か
 * 読み込みが終わる前の `currentTime` への代入を、**Safari は取りこぼす**こと
 * で知られる（Chrome は覚えてくれる — 実測で確かめた）。取りこぼすと曲の頭
 * から鳴り、**頭出しが黙って無視される**。数字は入っていて音も鳴るので、
 * 画面からは気づけない。
 *
 * 書き出しも案内は「新しい iPhone の Safari で」なので、そこで効かないのは
 * 困る。使う場所が2つある（動画の書き出しと、頭出しの試し聴き）ので関数にした。
 *
 * ここの偽物は**取りこぼす側**を演じる。Chrome で通ることは、Safari で
 * 通ることの証明にならない。
 */
type Listener = () => void;

/** 長さが分かるまで seek を捨てる、本物に近い偽物 */
class FakeAudio {
  readyState = 0;
  private seconds = 0;
  private listeners = new Map<string, Listener[]>();

  get currentTime() {
    return this.seconds;
  }
  set currentTime(value: number) {
    // ★ここが本物と同じ振る舞い。長さが分かる前は受け付けない
    if (this.readyState < 1) return;
    this.seconds = value;
    this.emit("seeked");
  }

  addEventListener(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }
  removeEventListener(event: string, listener: Listener) {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((item) => item !== listener),
    );
  }
  emit(event: string) {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener();
  }

  /** ブラウザが長さを読み終わった、を再現する */
  loadMetadata() {
    this.readyState = 1;
    this.emit("loadedmetadata");
  }

  as() {
    return this as unknown as HTMLAudioElement;
  }
}

beforeEach(() => {
  vi.stubGlobal("HTMLMediaElement", { HAVE_METADATA: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("seekFreshAudio", () => {
  /** ★これが本題。長さが分かるのを待ってから送る */
  it("長さが分かるまで待って、そのあとで送る", async () => {
    const audio = new FakeAudio();
    const pending = seekFreshAudio(audio.as(), 3);

    // まだ送られていない（本物もここでは捨てる）
    expect(audio.currentTime).toBe(0);

    audio.loadMetadata();
    await pending;

    expect(audio.currentTime).toBe(3);
  });

  it("もう長さが分かっていれば、すぐ送る", async () => {
    const audio = new FakeAudio();
    audio.readyState = 1;

    await seekFreshAudio(audio.as(), 7.5);

    expect(audio.currentTime).toBe(7.5);
  });

  it("負の位置は0にする", async () => {
    const audio = new FakeAudio();
    audio.readyState = 1;

    await seekFreshAudio(audio.as(), -4);

    expect(audio.currentTime).toBe(0);
  });

  /**
   * 読めない音源で書き出しごと止めない。**待ちは1回ぶんだけ** —
   * 送れない相手に seek の完了まで待つと、待ち時間が2倍になる
   */
  it("長さが分からないままでも、待ちは1回ぶんで諦める", async () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    let settled = false;
    void seekFreshAudio(audio.as(), 3).then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(2900);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(settled).toBe(true);
    // 送れていないので、曲の頭のまま（黙って諦めた形）
    expect(audio.currentTime).toBe(0);
  });

  it("読み込みが失敗しても、待ち続けない", async () => {
    const audio = new FakeAudio();
    const pending = seekFreshAudio(audio.as(), 3);

    audio.emit("error");

    await expect(pending).resolves.toBeUndefined();
  });
});
