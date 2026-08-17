import {
  resolveFormationPoints,
  selectPointsForDancers,
  DEFAULT_TRANSFORM,
  type FormationTemplate,
  type FormationTransform,
} from "@/features/canvas/lib/formationTemplates";

type Props = {
  formation: FormationTemplate;
  /** 何人入るか。点の方が多い形では、余る点を輪郭だけにする */
  dancerCount: number;
  stageWidth: number;
  stageHeight: number;
  /** 実際に入る人の色。足りなければ最後の色を使い回す */
  dancerColors: string[];
  transform?: FormationTransform;
  /** 客席がどちら側かを図の中に出す。文脈で分からない場所では立てる */
  audienceLabel?: string;
  className?: string;
};

/**
 * 隊形をステージの図で見せる。
 *
 * ■ なぜ図なのか
 * 「V字（後1-3-4前）」という名前だけでは、どんな並びなのか読めない。
 * **どこが空くのか**も、文章より図の方が早く分かる。
 *
 * ■ 人数より点が多い形
 * 実際に人が入る点だけを色で塗り、残りは輪郭だけの灰色にする。
 * 「8人用の形を6人でやると、両端が空く」が一目で分かる。
 *
 * ■ 部品にした理由（2026-08-17）
 * 同じ図が TemplateSheet の中に隠れていた。**隊形を見てもらった結果にも
 * 図を出す**ことになり、2箇所で必要になったので出した。
 * 片方だけ直して見た目が食い違う、を避ける。
 */
export function FormationPreview({
  formation,
  dancerCount,
  stageWidth,
  stageHeight,
  dancerColors,
  transform = DEFAULT_TRANSFORM,
  audienceLabel,
  className = "",
}: Props) {
  const points = resolveFormationPoints(
    formation.points,
    transform,
    stageWidth,
    stageHeight,
  );
  // selectPointsForDancers は元の配列の要素をそのまま返すので、
  // 参照の集合として「使われる点」を引ける
  const used = new Set(selectPointsForDancers(points, dancerCount));

  let filled = 0;

  return (
    <span
      aria-hidden
      className={`relative block w-full overflow-hidden rounded-md border border-line-strong bg-surface-sunken ${className}`}
      style={{ aspectRatio: `${stageWidth} / ${stageHeight}` }}
    >
      <span
        className="absolute inset-0 block bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
        style={{
          backgroundSize: `${100 / stageWidth}% ${100 / stageHeight}%`,
        }}
      />
      {points.map((point, index) => {
        const isUsed = used.has(point);
        const color = isUsed
          ? (dancerColors[filled++] ?? dancerColors[dancerColors.length - 1])
          : undefined;
        return (
          <span
            key={index}
            className={`absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              isUsed ? "" : "border border-line-strong"
            }`}
            style={{
              left: `${(point.x / stageWidth) * 100}%`,
              top: `${(point.y / stageHeight) * 100}%`,
              backgroundColor: color ?? "transparent",
            }}
          />
        );
      })}
      {/* どちらが客席かは、図だけでは分からない。上下が逆だと別の隊形に見える */}
      {audienceLabel && (
        <span className="absolute inset-x-0 bottom-0 block bg-surface-sunken/80 py-px text-center text-[9px] leading-tight tracking-wide text-fg-muted">
          {audienceLabel}
        </span>
      )}
    </span>
  );
}
