"use client";

import { useEffect, useState } from "react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import {
  decodeWaveform,
  type Waveform,
} from "@/features/music/lib/waveformPeaks";

/**
 * いま入っている曲の波形。読み込み中と、曲が無いときは null。
 *
 * 曲の実体は ObjectURL としてしか持っていない(サーバーへ上げない方針。
 * useMusicStore のコメント参照)ので、そこから読み直して山の列にする。
 * blob: の URL なので、fetch はネットワークへ出ずメモリの中で完結する。
 *
 * 【読み込みの間も画面は動く】。波形は時間軸の【地】であって、
 * 目盛り・シーンのコマ・再生ヘッドはそれが無くても成立する。
 * 数百msの読み込みで軸が出ないと、曲を入れた瞬間だけ画面が欠けて見える。
 */
export function useWaveformPeaks(): Waveform | null {
  const objectUrl = useMusicStore((state) => state.objectUrl);
  // どの曲の波形かを一緒に持つ。曲を選び直した直後、まだ読み終えていない
  // 一瞬に前の曲の波形が出ないようにするため。読み込みの開始時に
  // null へ戻す(effectの中でsetStateする)必要が無くなる
  const [decoded, setDecoded] = useState<{
    url: string;
    waveform: Waveform | null;
  } | null>(null);

  useEffect(() => {
    if (!objectUrl) return;

    let isCurrent = true;
    void (async () => {
      try {
        const blob = await fetch(objectUrl).then((response) => response.blob());
        const waveform = await decodeWaveform(blob);
        if (isCurrent) setDecoded({ url: objectUrl, waveform });
      } catch {
        // 読めない曲。波形が出ないだけで、再生も時間軸もそのまま動く
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [objectUrl]);

  return decoded && decoded.url === objectUrl ? decoded.waveform : null;
}
