import { describe, expect, it } from "vitest";
import {
  buildSharedTrackPath,
  formatBytes,
  MAX_SHARED_TRACK_BYTES,
  sharedTrackContentType,
  shareTrackBlocker,
} from "./sharedTrack";

/**
 * **道から中身が読めないこと**と、**上げられない理由が1箇所で決まること**。
 *
 * どちらも間違えても画面は普通に動いて見える。道にファイル名が入っていても
 * 曲は鳴るし、理由の判定がずれてもボタンは出る。
 */
describe("buildSharedTrackPath", () => {
  it("作品の中へ置く", () => {
    expect(buildSharedTrackPath("p1", "song.mp3")).toMatch(/^p1\//);
  });

  /* **ここが要。** 名前には個人名や公演名が入る（発表会_さくら.mp3 など） */
  it("ファイル名を道に入れない", () => {
    const path = buildSharedTrackPath("p1", "発表会_さくら_本番用.mp3");

    expect(path).not.toContain("さくら");
    expect(path).not.toContain("発表会");
    expect(path).not.toContain("本番用");
  });

  it("拡張子だけは残す（形の手がかりになる。中身は読めない）", () => {
    expect(buildSharedTrackPath("p1", "song.MP3")).toMatch(/\.mp3$/);
    expect(buildSharedTrackPath("p1", "song.m4a")).toMatch(/\.m4a$/);
  });

  it("拡張子が無くても通る", () => {
    expect(buildSharedTrackPath("p1", "song")).toMatch(/^p1\/[0-9a-f-]+$/);
  });

  /* 同じ曲を上げ直しても別の道になる。差し替えが古い道に当たらない */
  it("呼ぶたびに違う道になる", () => {
    expect(buildSharedTrackPath("p1", "song.mp3")).not.toBe(
      buildSharedTrackPath("p1", "song.mp3"),
    );
  });
});

/**
 * **Android の選択画面は、形を空で返すことがある。**
 * 空のまま上げると `text/plain` になってバケットに弾かれ、
 * 「編集画面では鳴っていた曲が、共有のときだけ失敗する」という
 * 説明しようのない壊れ方になる。
 */
describe("sharedTrackContentType", () => {
  it("ブラウザが音声だと言っているなら、それを使う", () => {
    expect(sharedTrackContentType("song.mp3", "audio/mpeg")).toBe("audio/mpeg");
    expect(sharedTrackContentType("song.wav", "audio/x-wav")).toBe("audio/x-wav");
  });

  it("空なら、拡張子から決める", () => {
    expect(sharedTrackContentType("song.m4a", "")).toBe("audio/mp4");
    expect(sharedTrackContentType("song.wav", "")).toBe("audio/wav");
    expect(sharedTrackContentType("song.flac", "")).toBe("audio/flac");
  });

  /* 音声ではない形を名乗ってきても、拡張子の方を信じる */
  it("音声でない形を名乗られても、拡張子で上書きする", () => {
    expect(sharedTrackContentType("song.mp3", "text/plain")).toBe("audio/mpeg");
    expect(
      sharedTrackContentType("song.mp3", "application/octet-stream"),
    ).toBe("audio/mpeg");
  });

  it("手がかりが何も無ければ mp3 として送る", () => {
    expect(sharedTrackContentType("song", "")).toBe("audio/mpeg");
  });
});

describe("shareTrackBlocker", () => {
  it("ふつうの曲は配れる", () => {
    expect(shareTrackBlocker({ isGuest: false, fileSizeBytes: 8_000_000 })).toBeNull();
  });

  /* 作品の行が無いので、Storage 側で持ち主だと名乗れない */
  it("保存していない作品は配れない", () => {
    expect(shareTrackBlocker({ isGuest: true, fileSizeBytes: 8_000_000 })).toBe(
      "guest",
    );
  });

  it("この端末に音源が無ければ配れない", () => {
    expect(shareTrackBlocker({ isGuest: false, fileSizeBytes: null })).toBe(
      "missing",
    );
  });

  /* **境目まで見る。** ちょうど上限は通す（バケット側も 20MB ちょうどは通る） */
  it("上限ちょうどは通り、1バイト超えたら止める", () => {
    expect(
      shareTrackBlocker({ isGuest: false, fileSizeBytes: MAX_SHARED_TRACK_BYTES }),
    ).toBeNull();
    expect(
      shareTrackBlocker({
        isGuest: false,
        fileSizeBytes: MAX_SHARED_TRACK_BYTES + 1,
      }),
    ).toBe("tooLarge");
  });

  /* 理由は1つだけ返す。ゲストで、かつ大きすぎるときは「ゲスト」が先 —
     先に片付かないと、小さくしても結局配れない */
  it("ゲストなら、大きさより先にそちらを言う", () => {
    expect(
      shareTrackBlocker({
        isGuest: true,
        fileSizeBytes: MAX_SHARED_TRACK_BYTES + 1,
      }),
    ).toBe("guest");
  });
});

describe("formatBytes", () => {
  it("MBで読める形にする", () => {
    expect(formatBytes(8_200_000)).toBe("7.8MB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20MB");
  });

  /* 1MB未満を 0.0MB と出すと「入っていない」ように見える */
  it("小さいものは KB で出す", () => {
    expect(formatBytes(50_000)).toBe("49KB");
  });
});
