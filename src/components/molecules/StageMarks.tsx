"use client";

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** センターから振る番号の上限。これより外はステージの角に近く、
 * 目盛りとして読ませる価値より紛らわしさが勝つ */
const MAX_MARK = 6;

/**
 * バミリ — 客席側の縁に貼る目盛り。
 *
 * 稽古場では舞台の前縁にテープを貼り、センターを0として下手・上手へ
 * 1、2、3…と番号を振る。「センターから下手3」のように、位置を言葉で
 * 受け渡すための共通の物差しになる。同じものを画面の下端に置く。
 *
 * 【固定】であることが要点。ダンサーやシーンによって変わらないので、
 * どのシーンを見ていても同じ目盛りがそこにある。位置を読むための
 * 物差しが場面ごとに動いては物差しにならない。
 *
 * 中央から左右へ同じ番号が伸びる(…3 2 1 0 1 2 3…)。左右で番号を
 * 続けて振らないのは、舞台の呼び方がセンター基準の左右対称だから。
 * どちら側かは、その人がステージのどちら半分に居るかで分かる。
 */
export function StageMarks({ stageWidthUnits, stageHeightUnits }: Props) {
  const center = stageWidthUnits / 2;
  // 中央(0)から両側へ1ユニット刻み。ただし端までは振らない。
  // いちばん外の目盛りはステージの角に重なって読みづらいうえ、
  // その位置に人が立つこと自体が少ないため
  const steps = Math.min(MAX_MARK, Math.floor(center));

  const marks: { key: string; xUnits: number; label: number }[] = [
    { key: "c", xUnits: center, label: 0 },
  ];
  for (let step = 1; step <= steps; step += 1) {
    marks.push({ key: `l${step}`, xUnits: center - step, label: step });
    marks.push({ key: `r${step}`, xUnits: center + step, label: step });
  }

  return (
    <div
      aria-hidden
      data-testid="stage-marks"
      className="pointer-events-none absolute inset-0"
    >
      {marks.map((mark) => {
        const isCenter = mark.label === 0;
        return (
          <span
            key={mark.key}
            className="absolute bottom-0 flex flex-col items-center"
            style={{
              left: `${(mark.xUnits / stageWidthUnits) * 100}%`,
              translate: "-50% 0",
            }}
          >
            <span
              className={
                isCenter
                  ? "w-0.5 bg-accent/70"
                  : "w-px bg-[var(--stage-grid)] opacity-90"
              }
              // センターだけ長くして、遠目にも中心が拾えるようにする
              style={{
                height: `${((isCenter ? 1.1 : 0.55) / stageHeightUnits) * 100}%`,
              }}
            />
            <span
              className={`pb-1 font-mono text-label leading-none ${
                isCenter ? "font-bold text-accent-soft" : "text-fg-sub"
              }`}
            >
              {mark.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
