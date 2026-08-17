"use client";

import { useState } from "react";

/** 直せなかった/直した理由。画面に短い一文を出すのに使う */
export type NumberCorrection = "notANumber" | "tooSmall" | "tooLarge" | null;

type Params = {
  /** いま確定している値 */
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/**
 * 数を入れる欄の共通の作法。
 *
 * ■ 打っている間は値に触らない
 * 1文字打つたびに min/max へ丸めると、下限より小さい桁から始まる数が
 * **どうやっても入力できない**(ステージの幅は下限6だったので「10」の
 * 「1」で 6 に化けた)。打っている最中の文字列をここで預かり、
 * **欄から離れた時点で1回だけ**数にして丸める。
 *
 * ■ 直したことを黙って済ませない(2026-08-17)
 * 範囲外や数でないものを入れると前の値へ戻していたが、**何も言わずに
 * 戻すので「打った数が消えた」ようにしか見えなかった**。何が起きたかを
 * 呼び出し側が出せるよう、直した理由を返す。
 *
 * 設定の行と曲の頭出しが別々に同じことを書いていたので、ここへ寄せた。
 */
export function useNumberDraft({ value, min, max, onChange }: Params) {
  // 入力中の【文字列】。数値にすると "1" と "1." の区別が消え、
  // 小数を打っている途中で勝手に整形されてしまう
  const [draft, setDraft] = useState(String(value));
  const [correction, setCorrection] = useState<NumberCorrection>(null);

  // 外から値が変わったとき(設定の初期化など)に追い付く。
  //
  // useEffect で setDraft する形は使えない。描画が終わってからもう一度
  // 描き直すことになり、この書き方は lint でも止められる。
  // **描画の途中で前回の値と比べて直す**のが React の言う正しい形で、
  // 追加の描画は同じ処理の中で片付く(打っている間は value が動かないので、
  // ここが入力を邪魔することはない)
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
    setCorrection(null);
  }

  /** 欄から離れた/Enterを押した時に1回だけ走る。ここで初めて丸める */
  const commit = () => {
    const parsed = Number(draft.trim());
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      setCorrection("notANumber");
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    setCorrection(
      clamped === parsed ? null : parsed < min ? "tooSmall" : "tooLarge",
    );
    // **自分で起こした変更を「外から変わった」と数えない。**
    // 先に控えておかないと、丸めた値が親から返ってきた時点で上の
    // 追い付き処理が走り、いま出したばかりの理由が消える
    setLastValue(clamped);
    if (clamped !== value) onChange(clamped);
  };

  return {
    draft,
    /** 打っている最中の文字列を受け取る。ここでは丸めない */
    setDraft: (next: string) => {
      setDraft(next);
      setCorrection(null);
    },
    commit,
    correction,
  };
}
