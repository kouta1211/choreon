"use client";

import { useEffect, useRef } from "react";
import { beatTimesInWindow, isDownbeat } from "@/features/music/lib/metronome";

/** 予約を出しに行く間隔(ms)。ここが多少遅れても音はずれない */
const SCHEDULER_INTERVAL_MS = 25;

/** 何秒先まで予約しておくか。間隔より十分長く取る */
const LOOKAHEAD_SECONDS = 0.12;

/** クリック音の長さ(秒)。短く切らないと拍が団子になる */
const CLICK_SECONDS = 0.04;

/** 小節の頭とそれ以外の高さ(Hz)。頭が高いと何拍目か耳で数えられる */
const DOWNBEAT_HZ = 1600;
const BEAT_HZ = 1000;

type Params = {
  /** 鳴らすかどうか。再生中かつメトロノームONのときだけ true */
  isActive: boolean;
  bpm: number;
};

/**
 * メトロノーム。Web Audio API の時計で拍を鳴らす。
 *
 * ■ setInterval で「鳴らして」はいない
 * 仕様書のとおり、鳴らす合図に JS のタイマーを使うと拍が揺れる。
 * ここで setInterval が担っているのは【予約を出しに行くこと】だけで、
 * 実際に音が出る時刻は AudioContext に渡した値で決まる。予約が
 * 少し早く入ろうが遅く入ろうが、鳴る時刻は変わらない(metronome.ts 参照)。
 *
 * ■ AudioContext は再生ボタンを押してから作る
 * ブラウザは、利用者の操作を伴わずに音を出すことを許さない。
 * 画面を開いた時点で作ると suspended のまま止まり、最初の数拍が鳴らない。
 */
export function useMetronome({ isActive, bpm }: Params) {
  const contextRef = useRef<AudioContext | null>(null);
  /** どこまで予約し終えたか(AudioContextの時計) */
  const scheduledUntilRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    if (!contextRef.current) {
      try {
        contextRef.current = new AudioContext();
      } catch {
        // 音が出せない環境。メトロノームだけ黙るが、時計は進み続ける
        return;
      }
    }
    const context = contextRef.current;
    // 一度止めたコンテキストは、再生のたびに起こし直す必要がある
    void context.resume().catch(() => {});

    // 押した瞬間を1拍目にする。前回の続きから数えると、止めて押し直した
    // ときに最初の拍が半端な位置で鳴る
    const origin = context.currentTime;
    scheduledUntilRef.current = origin;

    const click = (time: number, isFirstOfBar: boolean) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = isFirstOfBar ? DOWNBEAT_HZ : BEAT_HZ;
      // 立ち上がりと減衰を付ける。矩形に切ると耳障りなノイズが乗る
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        isFirstOfBar ? 0.5 : 0.32,
        time + 0.002,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_SECONDS);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + CLICK_SECONDS);
    };

    const schedule = () => {
      const until = context.currentTime + LOOKAHEAD_SECONDS;
      const beats = beatTimesInWindow(
        bpm,
        scheduledUntilRef.current,
        until,
        origin,
      );
      for (const time of beats) click(time, isDownbeat(time, bpm, origin));
      scheduledUntilRef.current = until;
    };

    schedule();
    const timer = setInterval(schedule, SCHEDULER_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      // 予約済みの音は鳴り切ってしまうので、止めた時点で黙らせる
      void context.suspend().catch(() => {});
    };
  }, [isActive, bpm]);

  // 画面を離れるときにオーディオの資源を返す
  useEffect(() => {
    return () => {
      void contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    };
  }, []);
}
