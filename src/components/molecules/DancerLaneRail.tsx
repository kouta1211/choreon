"use client";

import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import type { DancerLane } from "@/features/scene/lib/dancerLanes";

type Props = {
  lanes: DancerLane[];
  /** 何番目のシーンを見ているか(0始まり)。どのシーンにも当たっていなければ-1 */
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  sceneCount: number;
};

/** 名前を出す左端の幅(px)。ここを可変にすると、人によって
 * レーンの始まる位置がずれて時間軸として読めなくなる */
const NAME_COLUMN_PX = 52;

/**
 * 1人1本の横線で「誰がいつ動くか」を見せるレール。ドットレールの代わりに
 * ドックの最下段へ出す(「表示とモード」で切り替える)。
 *
 * 読み方:
 *   丸      … そのシーンでの立ち位置。舞台に居ない区間は丸を描かない
 *   太い線  … その区間で動く
 *   細い線  … その区間は動かない(その場に留まる)
 *   数字    … その人だけの遷移時間。シーンの既定と違うときだけ出す
 *
 * ステージは空間の絵なので、どのタイミングで誰が動くかまでは読めない。
 * 同じデータを時間の軸へ並べ替えると、「サビの手前で3人が同時に動く」
 * といった塊が縦に揃って見えるようになる。
 *
 * 人数ぶん縦に伸びるので、高さに上限を付けて中でスクロールさせる。
 * ステージの高さを削ってまで全員を一度に見せる価値は無い。
 */
export function DancerLaneRail({
  lanes,
  selectedIndex,
  onSelectIndex,
  sceneCount,
}: Props) {
  if (lanes.length === 0 || sceneCount === 0) return null;

  return (
    <div className="max-h-[132px] overflow-y-auto px-4 pt-3">
      <div className="flex flex-col gap-1.5">
        {lanes.map((lane) => (
          <div key={lane.dancerId} className="flex items-center gap-2">
            <span
              className="shrink-0 truncate text-[10.5px] text-fg-sub"
              style={{ width: NAME_COLUMN_PX }}
            >
              {lane.dancerName}
            </span>

            <div className="flex min-w-0 flex-1 items-center">
              {lane.stops.map((isOnStage, index) => (
                // 丸と、その直前の区間の線を1組にして並べる。
                // 区間は丸より1つ少ないので、先頭は線を描かない
                <div
                  key={index}
                  className={`flex items-center ${index === 0 ? "" : "min-w-0 flex-1"}`}
                >
                  {index > 0 && (
                    <span
                      aria-hidden
                      className={`block min-w-0 flex-1 rounded-full ${
                        lane.steps[index - 1]?.isMoving
                          ? "h-[3px]"
                          : "h-px bg-line-strong"
                      }`}
                      style={
                        lane.steps[index - 1]?.isMoving
                          ? {
                              backgroundColor: themedDancerColor(
                                lane.dancerColor,
                              ),
                            }
                          : undefined
                      }
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    aria-label={`${index + 1}番目のシーンへ`}
                    aria-current={index === selectedIndex}
                    className="flex h-6 w-6 shrink-0 items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className={`block rounded-full ${
                        isOnStage
                          ? index === selectedIndex
                            ? "h-[9px] w-[9px] ring-2 ring-accent"
                            : "h-[7px] w-[7px]"
                          : "h-[3px] w-[3px] bg-line-strong"
                      }`}
                      style={
                        isOnStage
                          ? {
                              backgroundColor: themedDancerColor(
                                lane.dancerColor,
                              ),
                            }
                          : undefined
                      }
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* その人だけの遷移時間は、レーンの下にまとめて1行で添える。
          区間の線の上に数字を重ねると、人数が増えたときに読めなくなる */}
      <OwnDurationNote lanes={lanes} />
    </div>
  );
}

function OwnDurationNote({ lanes }: { lanes: DancerLane[] }) {
  const notes = lanes.flatMap((lane) =>
    lane.steps
      .map((step, index) =>
        step.hasOwnDuration
          ? `${lane.dancerName} ${index + 2}番目へ ${step.durationSeconds}s`
          : null,
      )
      .filter((note): note is string => note !== null),
  );

  if (notes.length === 0) return null;

  return (
    <p className="mt-2 font-mono text-[10px] text-fg-muted">
      個別の速さ: {notes.join(" · ")}
    </p>
  );
}
