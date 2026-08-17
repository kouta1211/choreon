"use client";

import { useEffect, useRef } from "react";
import { beatTimesInWindow, isDownbeat } from "@/features/music/lib/metronome";

/** 予約を出しに行く間隔(ms)。ここが多少遅れても音はずれない */
const SCHEDULER_INTERVAL_MS = 25;

/** 何秒先まで予約しておくか。間隔より十分長く取る */
const LOOKAHEAD_SECONDS = 0.12;

/**
 * クリック音の長さ(秒)。
 *
 * 0.04 秒の矩形に近い音は「怖い」という指摘をもらった。稽古場で人が数える
 * 声のつもりなので、**少し長く・角を丸く**して、木のブロックを叩いたような
 * 音に寄せてある。長すぎると拍が団子になるので 0.09 秒まで。
 */
const CLICK_SECONDS = 0.09;

/**
 * 小節の頭とそれ以外の高さ(Hz)。頭が高いと何拍目か耳で数えられる。
 *
 * 1600/1000Hz は耳に刺さる帯域だったので、1オクターブほど下げた。
 * 高さの差(完全4度)は残してあるので、頭かどうかは変わらず聞き分けられる。
 */
const DOWNBEAT_HZ = 880;
const BEAT_HZ = 660;

/** 予備拍(カウントイン)の高さ。拍そのものより一段低くして、
 * 「まだ始まっていない」ことを音でも分ける */
const COUNT_IN_HZ = 520;

type Params = {
  /** 鳴らすかどうか。再生中かつメトロノームONのときだけ true */
  isActive: boolean;
  bpm: number;
  /** 何拍ごとに高い音にするか。作品の拍子(projects.beats_per_bar)。
   * 数える単位の8カウントとは別で、ここで決まるのは音の高さだけ */
  beatsPerBar?: number;
  /** いま鳴らしているのが予備拍か。低い音に切り替える */
  isCountIn?: boolean;
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
export function useMetronome({
  isActive,
  bpm,
  beatsPerBar = 4,
  isCountIn = false,
}: Params) {
  const contextRef = useRef<AudioContext | null>(null);
  /** どこまで予約し終えたか(AudioContextの時計) */
  const scheduledUntilRef = useRef(0);
  /**
   * いま鳴らしたいかどうか。suspend/resume はどちらも約束(Promise)で、
   * **止める約束が、そのあとに出した起こす約束より遅れて片付くことがある**。
   * 順番が入れ替わると、鳴らしたいのに止まったままになる。片付いた時点で
   * もう一度ここを見て、食い違っていたら直す。
   */
  const wantsSoundRef = useRef(false);
  /**
   * 予備拍かどうかは**効果の作り直しに使わない**。
   *
   * 依存に入れると、数え終わって再生へ移る瞬間に効果が畳まれて
   * AudioContext が suspend され、直したばかりの「カウントインのあと
   * 音が出ない」が戻ってくる。音の高さを選ぶだけの値なので、
   * 予約を出すその場で読めばよい。
   */
  const isCountInRef = useRef(isCountIn);
  useEffect(() => {
    isCountInRef.current = isCountIn;
  }, [isCountIn]);

  useEffect(() => {
    wantsSoundRef.current = isActive;
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
      // 正弦波にする。既定の矩形に近い倍音が「怖い」の正体だった
      oscillator.type = "sine";
      const isCountingIn = isCountInRef.current;
      oscillator.frequency.value = isCountingIn
        ? COUNT_IN_HZ
        : isFirstOfBar
          ? DOWNBEAT_HZ
          : BEAT_HZ;
      // 立ち上がりと減衰を付ける。角で切ると耳障りなノイズが乗る。
      // 以前は 2ms で立ち上げていたが、そのカチッという当たりが
      // きつかったので 8ms かけて上げ、減衰も長めに取る
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        isFirstOfBar && !isCountingIn ? 0.34 : 0.24,
        time + 0.008,
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
      for (const time of beats) {
        click(time, isDownbeat(time, bpm, origin, beatsPerBar));
      }
      scheduledUntilRef.current = until;
    };

    schedule();
    const timer = setInterval(schedule, SCHEDULER_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      // 予約済みの音は鳴り切ってしまうので、止めた時点で黙らせる。
      // 黙らせ終わった時点でまた鳴らしたくなっていたら、その場で起こし直す
      void context
        .suspend()
        .catch(() => {})
        .then(() => {
          if (wantsSoundRef.current) void context.resume().catch(() => {});
        });
    };
  }, [isActive, bpm, beatsPerBar]);

  // 画面を離れるときにオーディオの資源を返す
  useEffect(() => {
    return () => {
      void contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    };
  }, []);
}
