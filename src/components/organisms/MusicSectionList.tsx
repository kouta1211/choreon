"use client";

import { Scissors, Trash2 } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useMusicPlacement } from "@/features/music/hooks/useMusicPlacement";
import { NumberField } from "@/components/molecules/NumberField";
import { TapTempoButton } from "@/components/molecules/TapTempoButton";
import { PressableButton } from "@/components/atoms/PressableButton";
import { BEATS_PER_SET } from "@/features/music/lib/counts";
import { MAX_SECTION_LABEL_LENGTH } from "@/features/music/lib/placement";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import { formatMinutes } from "@/features/scene/lib/clock";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * **曲の区切り**（2026-09-15）。ショーケースは1本の中で曲が変わる。
 *
 * ■ 振付は切れない
 * 振付はカウントで組むので、曲が3曲でも**拍の列は1本のまま**。
 * ここで切るのは「載せ方」だけ — どの拍から、曲の何秒目に、どんな速さで
 * 置くか。だから区切りを置いても**隊形は1つも動かない**。
 *
 * ■ 8カウントの頭で区切る
 * 曲の変わり目がセットの途中に来ることは、まず無い。選んでいるシーンの
 * いちばん近いセットの頭へ寄せる。
 *
 * ■ 速さは区間ごと
 * 次の区切りへ食い込む手前で止まる（`restretchAt`）。越えると拍に対する
 * 秒が逆走し、シーンの並びそのものが入れ替わるため。
 */
export function MusicSectionList() {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const placement = useMusicPlacement();
  /* 叩く相手を、この板の中で鳴らせるようにする。曲が無ければ出さない */
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const requestTogglePlay = useUIStore((state) => state.requestTogglePlay);
  const requestSeek = useUIStore((state) => state.requestSeek);

  /* **その区間の頭から鳴らす**（2026-09-25）。

     ただ再生するだけだと、縦線の居る所から鳴る — 2曲目の行を押したのに
     1曲目が鳴る、ということが起きる。測りたいのは**その行の曲**なので、
     先に頭へ送ってから鳴らす。

     止めるときは送らない。押した所で止まるのが再生の約束
     （user の指示 2026-08-22）で、そこを崩さない */
  const playSection = (fromSeconds: number) => {
    if (!isPlaying) requestSeek(fromSeconds);
    requestTogglePlay();
  };

  const selected = scenes.find((scene) => scene.id === selectedSceneId);
  /* いちばん近い8カウントの頭。拍で持っているので割り算1つで出る
     （秒を経由すると往復の丸めでずれる） */
  const splitBeat =
    selected === undefined
      ? null
      : Math.round(selected.positionBeats / BEATS_PER_SET) * BEATS_PER_SET;

  const canSplit =
    splitBeat !== null &&
    splitBeat > 0 &&
    !placement.sections.some((section) => section.fromBeat === splitBeat);

  return (
    <div className="flex flex-col gap-unit">
      <div>
        <p className="text-label text-fg">{t.music.sectionsTitle}</p>
        <p className="mt-1.5 text-caption leading-snug text-fg-muted">
          {t.music.sectionsNote}
        </p>
      </div>

      {/* **区切りが1つのときは一覧を出さない。** 区間が1つなら、速さを
          決める口は「曲がないときの拍」のスライダーと同じものになる。
          両方出すと**同じ値を変える欄が2つ**になり、片方が必ず古くなる
          （.claude/rules/state.md 7節）。まだ曲を分けていない人には、
          並べる相手も無いので読む物が増えるだけ */}
      <ul className="flex flex-col gap-base">
        {placement.sections.length > 1 &&
          placement.sections.map((section) => (
            <li
              key={section.index}
              className="card-surface flex flex-col gap-unit rounded-lg p-unit"
            >
              <div className="flex items-center gap-unit">
                <input
                  type="text"
                  value={section.label ?? ""}
                  maxLength={MAX_SECTION_LABEL_LENGTH}
                  aria-label={t.music.sectionName}
                  placeholder={t.music.sectionDefaultName(section.index + 1)}
                  onChange={(event) =>
                    void placement.renameSection(
                      section.index,
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-unit py-1.5 text-label text-fg-strong placeholder:text-fg-muted"
                />
                {/* 先頭は外せない。外すと写せない拍ができる */}
                {section.index > 0 && (
                  <PressableButton
                    type="button"
                    aria-label={t.music.sectionRemove}
                    onClick={() => void placement.mergeAt(section.index)}
                    className="rounded-md border border-line p-1.5 text-fg-sub"
                  >
                    <Trash2 size={15} aria-hidden />
                  </PressableButton>
                )}
              </div>

              {/* **カウントは出さない**（2026-09-15・第2段）。区切りごとに
                  数え直すので、ここは必ず `1-1` になる。出しても情報が無い */}
              <p className="font-mono text-mono-s text-fg-muted">
                {t.music.sectionStart(formatMinutes(section.fromSeconds))}
              </p>

              <NumberField
                label={t.music.sectionBpm}
                value={Math.round(section.bpm)}
                min={MIN_BPM}
                max={MAX_BPM}
                unit={t.music.bpmUnit}
                size="sheet"
                onChange={(next) =>
                  void placement.setSectionBpm(section.index, next)
                }
              />

              {/* **区切りごとに1つ置く**（2026-09-25）。

                  はじめは「どの区間を測ったのか読めない」として、
                  区切りが2つ以上のときは出さなかった。だが
                  **曲が変わる作品こそ、曲ごとの速さを測りたい** —
                  いちばん要る場面で使えない作りだった（user の報告
                  「でてきません」）。行の中に置けば、どの区間かは
                  画面から読める。

                  読み上げ用の名前だけ、その区間の名前を足す
                  （同じ字のボタンが並ぶため） */}
              <TapTempoButton
                ariaLabel={t.music.tapTempoFor(
                  section.label ?? t.music.sectionDefaultName(section.index + 1),
                )}
                onMeasured={(next) =>
                  void placement.setSectionBpm(section.index, next)
                }
                isPlaying={isPlaying}
                onTogglePlay={
                  hasMusic ? () => playSection(section.fromSeconds) : undefined
                }
              />
            </li>
          ))}
      </ul>

      <PressableButton
        type="button"
        disabled={!canSplit}
        onClick={() => splitBeat !== null && void placement.splitAt(splitBeat)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-gutter py-unit text-label text-fg-strong disabled:opacity-50"
      >
        <Scissors size={15} aria-hidden />
        {t.music.sectionSplit}
      </PressableButton>
      <p className="text-caption leading-snug text-fg-muted">
        {selected === undefined
          ? t.music.sectionNeedScene
          : t.music.sectionSplitNote}
      </p>
    </div>
  );
}
