"use client";

import { useState } from "react";

/** 直せなかった/直した理由。画面に短い一文を出すのに使う */
export type NumberCorrection = "notANumber" | "tooSmall" | "tooLarge" | null;

type Params = {
  /** いま確定している値 */
  value: number;
  min: number;
  max: number;
  /**
   * 確定した値を渡す。**受け取らなかったときは false を返す。**
   * ステージを狭める操作のように「押しても変えない」ことがある欄では、
   * 変わっていないのに打った数だけが残ると、どちらが効いているのか
   * 読めなくなる（実機の台本 03-19「欄の数も元に戻る」）。
   */
  onChange: (value: number) => void | boolean;
};

/**
 * 数を入れる欄の共通の作法。
 *
 * ■ 打っている間は値に触らない
 * 1文字打つたびに min/max へ丸めると、下限より小さい桁から始まる数が
 * **どうやっても入力できない**(ステージの幅は下限6だったので「10」の
 * 「1」で 6 に化けた)。打っている最中の文字列をここで預かり、
 * **押されたときに1回だけ**数にして丸める。
 *
 * ■ 直したことを黙って済ませない(2026-08-17)
 * 範囲外や数でないものを入れると前の値へ戻していたが、**何も言わずに
 * 戻すので「打った数が消えた」ようにしか見えなかった**。何が起きたかを
 * 呼び出し側が出せるよう、直した理由を返す。
 *
 * ■ 「更新」を押すまで変えない(2026-08-18)
 * 以前は欄から離れた時点で確定していた。**効いたのかどうかが分からない**
 * という報告が2回来た（12-2「更新や保存ボタンのようなものがあってもいい」/
 * 12-10「更新ボタンがほしい。それをおしたら、更新する」）。
 *
 * 離れた時点で黙って確定するのをやめ、**押されたときだけ**変える。
 * 打ったまま離れても下書きは残り、ボタンも出たままなので、
 * 見えないところで消えることはない。Enter は押したのと同じ扱い。
 *
 * ■ 受け取れない下書きは、押す前に止める(2026-08-18)
 * 以前は**押してから**丸めたり前の値へ戻したりしていた。
 * 「バリデーションが効いているときは、適用ボタンは押せないようにする」
 * （実機報告 12-9）。打っている最中の下書きを見て `invalid` を返し、
 * 呼び出し側がボタンを押せなくする。**丸めるのは相変わらずしない** —
 * 丸めると、下限より小さい桁から始まる数がどうやっても打てない。
 *
 * 設定の行と曲の頭出しが別々に同じことを書いていたので、ここへ寄せた。
 */
export function useNumberDraft({ value, min, max, onChange }: Params) {
  // 入力中の【文字列】。数値にすると "1" と "1." の区別が消え、
  // 小数を打っている途中で勝手に整形されてしまう
  const [draft, setDraft] = useState(String(value));
  const [correction, setCorrection] = useState<NumberCorrection>(null);
  /** 直前に押して変えたか。「更新しました」を出すためだけの印 */
  const [justApplied, setJustApplied] = useState(false);

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
    setJustApplied(false);
  }

  /**
   * いま打っている下書きが、そのままでは受け取れないか。
   *
   * 打っている最中に毎回見る（値には触らない）。「10」を入れようとして
   * 「1」を打った瞬間は下限割れなので、そこでは押せない状態になる。
   */
  const trimmed = draft.trim();
  const parsedDraft = Number(trimmed);
  const invalid: NumberCorrection =
    trimmed === "" || !Number.isFinite(parsedDraft)
      ? "notANumber"
      : parsedDraft < min
        ? "tooSmall"
        : parsedDraft > max
          ? "tooLarge"
          : null;

  /** 「適用」を押した/Enterを押した時に1回だけ走る */
  const commit = () => {
    /* 受け取れないものは**入れない**。ボタンは押せなくしてあるが、
       Enter からも来るのでここでも止める。欄はそのまま残す
       （打ったものを黙って消さない） */
    if (invalid) {
      setCorrection(invalid);
      setJustApplied(false);
      return;
    }
    // ここまで来たものは範囲の中にある（丸める必要はもう無い）
    const next = parsedDraft;
    setCorrection(null);

    // **自分で起こした変更を「外から変わった」と数えない。**
    // 先に控えておかないと、確定した値が親から返ってきた時点で上の
    // 追い付き処理が走り、いま出したばかりの知らせが消える
    if (next === value) {
      setDraft(String(next));
      setLastValue(next);
      setJustApplied(false);
      return;
    }

    if (onChange(next) === false) {
      // 受け取ってもらえなかった。値は変わっていないので、欄も元へ戻す
      setDraft(String(value));
      setLastValue(value);
      setJustApplied(false);
      return;
    }

    setDraft(String(next));
    setLastValue(next);
    setJustApplied(true);
  };

  return {
    draft,
    /** 打っている最中の文字列を受け取る。ここでは丸めない */
    setDraft: (next: string) => {
      setDraft(next);
      setCorrection(null);
      setJustApplied(false);
    },
    commit,
    correction,
    /** いまの下書きが受け取れないか。押せなくするのに使う */
    invalid,
    /**
     * まだ押していない下書きがあるか。
     * **これが立っている間だけ「更新」を出す** — いつも出していると、
     * 押す必要があるのかどうかが読めない
     */
    isDirty: draft.trim() !== String(value),
    /** 押して変わった直後。「更新しました」を出すのに使う */
    justApplied,
  };
}
