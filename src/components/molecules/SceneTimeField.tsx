"use client";

import { formatClock } from "@/features/scene/lib/clock";

import { useId, type FocusEvent } from "react";
import { Hash } from "lucide-react";
import { CountLengthInput } from "@/components/molecules/CountLengthInput";
import { SegmentSplitBar } from "@/components/atoms/SegmentSplitBar";
import { countLengthLabel } from "@/features/music/lib/counts";
import {
  bareCountLabelAtBeat,
  beatFromCountLabel,
} from "@/features/music/lib/countLabel";
import type { Placement } from "@/features/music/lib/placement";
import {
  moveForHold,
  splitSegment,
} from "@/features/scene/lib/segmentSplit";
import type { OutgoingSegment } from "@/features/scene/lib/outgoingSegment";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** このシーンが頭から何拍目か。**保存の正**（`scenes.position_beats`） */
  positionBeats: number;
  /** 拍↔秒の写像。**どの区切りの中かを知るために要る**（曲が変わる作品） */
  placements: readonly Placement[];
  /** 同じ位置を秒で見たもの。⚠️ **派生値**。曲があるときの副表示にだけ使う */
  timeSeconds: number;
  /** 秒を副表示で添えるか。**曲があるときだけ true**（2026-08-26） */
  showSeconds: boolean;
  /** 位置を変える。**拍で渡す。**
   * 動くのはこのシーンだけ（隣を追い越せば順番も入れ替わる） */
  onCommit: (positionBeats: number) => void;
  /** **次のシーンへ出ていく区間**。最後のシーンは null（行き先が無い）。
   * 引くのは `lib/outgoingSegment`。ここへ条件を書き足さない */
  outgoing: OutgoingSegment | null;
  /** 出ていく区間の移動を変える。**拍で渡す。** null で区間まるごとへ戻す。
   * **書き込む先は次のシーン**（呼び出し側が targetSceneId で結ぶ） */
  onCommitMoveBeats: (moveBeats: number | null) => void;
  /** 入力欄を作り直す目印(シーンを切り替えたときに前の入力を残さない) */
  fieldKey: string;
};

/**
 * シーンの位置を編集する欄。**カウントで打つ**（2026-08-26）。
 *
 * ■ なぜカウントなのか
 * 振付は**カウントで組み、最後に曲へ載せる**（2026-08-25 の方向転換）。
 * 踊る側は秒で数えないので、`0:07.0` は打つ数としても読む数としても
 * 通じない。ここで打つのは `3-5`（3セット目の5カウント）。
 *
 * ■ 曲があるときだけ、秒を添える
 * 波形のどこに居るかと照らし合わせたい場面があるので、**読むだけ**の
 * 秒を下に置く。打てるのはカウントの側だけで、秒の欄は無い
 * （2つ打てると、どちらが正か画面から読めなくなる）。
 *
 * ■ 【位置】を入れる。長さではない
 * 以前は「前のシーンから何秒か」を入れていたが、その持ち方だと途中の
 * 1つを変えるたびに、それ以降のシーンが全部後ろへずれていた。
 * サビの頭に置いた隊形が、手前の移動を1カウント延ばしただけでサビから
 * 外れる、ということが起きる。触っていないシーンは動かない。
 *
 * 区間の【長さ】は隣との差なので、ここでは編集しない。編集できるのは
 * その区間を**どう割るか**（滞在 / 移動）だけ。
 */
export function SceneTimeField({
  positionBeats,
  placements,
  timeSeconds,
  showSeconds,
  onCommit,
  outgoing,
  onCommitMoveBeats,
  fieldKey,
}: Props) {
  const t = useT();
  const inputId = useId();
  const segmentBeats = outgoing?.segmentBeats ?? 0;
  /* 滞在は持たない。区間から移動を引いて出す — 2つ持たせると、
     足して区間にならない状態を作れてしまう（lib/segmentSplit）。
     **拍のまま割る**ので、載せ方を挟まない */
  const split = splitSegment(segmentBeats, outgoing?.moveBeats ?? null);

  const commit = (event: FocusEvent<HTMLInputElement>) => {
    /* **その区切りの中の** 3-5 として読む。曲をまたいで飛ばさない */
    const parsed = beatFromCountLabel(
      event.target.value,
      positionBeats,
      placements,
    );
    /* 読めない値は**丸めずに前の値へ戻す**。丸めて受けると、打った数と
       画面の数が食い違ったまま保存される */
    if (parsed === null || parsed === positionBeats) {
      event.target.value = bareCountLabelAtBeat(positionBeats, placements);
      return;
    }
    onCommit(parsed);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-2.5">
      <label htmlFor={inputId} className="flex items-center gap-2">
        <Hash size={13} className="shrink-0 text-fg-muted" />
        <span className="flex-1 text-label text-fg">
          {t.editor.scenes.countPosition}
        </span>
        <span className="flex shrink-0 items-center rounded-md border border-line-strong bg-surface-strong px-2 py-1 font-mono text-label text-fg focus-within:border-accent">
          <input
            id={inputId}
            key={fieldKey + positionBeats}
            type="text"
            inputMode="numeric"
            defaultValue={bareCountLabelAtBeat(positionBeats, placements)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-16 bg-transparent text-center tabular-nums outline-none"
          />
        </span>
      </label>

      {/* 曲に載せているときだけ、**読むだけ**の秒。打つ口は付けない */}
      {showSeconds && (
        <p className="text-right font-mono text-caption text-fg-muted tabular-nums">
          {formatClock(timeSeconds)}
        </p>
      )}

      {/* ■ **区間の長さ**は、ここでは変えられない（差として出るだけ）。
             長さを変えることは位置を動かすことなので、上の欄の仕事。
             同じ画面に2つ置くと「位置を決める」と「長さを決める」が競合する。

          ■ **区間の中の割り方**は、ここで決める（2026-08-24）。
             移動を短くすると、余りは**前**の滞在になる。
             位置は1拍も動かないので、上の競合には当たらない。 */}
      {outgoing !== null && (
        <div className="flex flex-col gap-1.5">
          {/* **割っている区間の長さを出す**（2026-08-25、user の求め）。
              滞在＋移動＝区間なので数としては言い直しだが、**打つ前に
              読める所に無いと、user が毎回引き算する**ことになっていた。
              バーと合わせて「4カウントの枠を、どこで割るか」が1目で分かる */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.segmentTotalCounts(countLengthLabel(segmentBeats))}
            </span>
          </div>
          <SegmentSplitBar
            segmentBeats={segmentBeats}
            holdBeats={split.hold}
            moveBeats={split.move}
            onCommit={onCommitMoveBeats}
          />
          {/* **どちらにも打てる。** 足すと必ず区間になるので、片方を
              打てばもう片方が動く。保存しているのは移動の側1つだけ
              （2つ保存すると、足して区間にならない状態を作れてしまう）。

              ■ **縦に積む。** 横に並べてはいけない（2026-08-24 に実機で
              踏んだ）。左のパネルは 288px で、この欄の中身に使えるのは
              189px しかない。ラベル+欄を2つ横に並べると 257px 要って、
              2つ目がカードの外へはみ出す。

              ■ 区間の長さは**ここには出さない**。滞在と移動を足せば
              区間なので、3つ目の数字は同じことを言い直しているだけ。

              ■ 出ているのは**次のシーンへ出ていく**区間（2026-08-24）。
              滞在しているあいだ踊り手は**このシーンの隊形**に立って
              いるので、書いてある場所と見えている隊形がここで一致する。
              **最後のシーンには出ない**（行き先が無い）。

              label で囲まない — CountLengthInput が自前の label を
              持っていて、入れ子になると読み上げの結び付きが壊れる */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.hold}
            </span>
            <CountLengthInput
              key={`hold-${fieldKey}-${split.hold}`}
              label={t.editor.scenes.holdLabel}
              value={split.hold}
              onCommit={(hold) =>
                onCommitMoveBeats(moveForHold(segmentBeats, hold))
              }
              max={segmentBeats}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-muted">
              {t.editor.scenes.move}
            </span>
            <CountLengthInput
              key={`move-${fieldKey}-${split.move}`}
              label={t.editor.scenes.moveCountsLabel}
              value={split.move}
              onCommit={onCommitMoveBeats}
              max={segmentBeats}
            />
          </div>
        </div>
      )}
    </div>
  );
}
