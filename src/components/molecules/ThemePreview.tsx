import type { ThemeId } from "@/features/theme/catalog";

/** ミニチュアに立たせる6人。実際の隊形(V字)をそのまま小さくしたもの */
const PREVIEW_POINTS = [
  { left: 50, top: 25, dancer: 6 },
  { left: 31.25, top: 41.7, dancer: 1 },
  { left: 68.75, top: 41.7, dancer: 3 },
  { left: 18.75, top: 66.7, dancer: 4 },
  { left: 81.25, top: 66.7, dancer: 5 },
  { left: 50, top: 75, dancer: 2 },
];

type Props = {
  themeId: ThemeId;
  /** 大きめに出すかどうか(詳細シートは大、一覧はミニチュア) */
  size?: "small" | "large";
};

/**
 * テーマのミニチュア。ヘッダー・ステージ・ドックという実物の並びを
 * そのまま縮めたもので、色見本のドットではなく「実際にどう見えるか」で
 * 選べるようにしている。
 *
 * 色は一切書いていない。自分自身に data-theme を付けているので、
 * themes.css がこの中だけを別のテーマとして塗る。テーマを増やしても
 * このファイルは変わらない。
 */
export function ThemePreview({ themeId, size = "small" }: Props) {
  const isLarge = size === "large";

  return (
    <div
      data-theme={themeId}
      aria-hidden
      className={`overflow-hidden bg-page ${isLarge ? "p-3" : "p-2"} rounded-[max(0px,calc(var(--radius)-2px))]`}
    >
      <div className={`flex flex-col ${isLarge ? "gap-2" : "gap-1.5"}`}>
        {/* ヘッダー: プロジェクト名とモードピル */}
        <div className="flex items-center gap-1.5">
          <span
            className={`flex-1 truncate font-semibold text-fg ${isLarge ? "text-[11px]" : "text-[9px]"}`}
          >
            Choreon
          </span>
          <span
            className={`shrink-0 border border-accent px-1 font-semibold text-accent ${
              isLarge
                ? "text-[8px] leading-[15px]"
                : "text-[6.5px] leading-[11px]"
            }`}
          >
            モード
          </span>
        </div>

        {/* ステージ */}
        <div className="relative aspect-[8/6] w-full overflow-hidden rounded-[max(0px,calc(var(--radius)-2px))] border-2 border-accent bg-stage">
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid)_1px,transparent_1px)]"
            style={{ backgroundSize: "12.5% 16.6667%" }}
          />
          {PREVIEW_POINTS.map((point) => (
            <span
              key={`${point.left}-${point.top}`}
              className="absolute block -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${point.left}%`,
                top: `${point.top}%`,
                width: isLarge ? 9 : 6.2,
                height: isLarge ? 9 : 6.2,
                backgroundColor: `var(--dancer-${point.dancer})`,
              }}
            />
          ))}
        </div>

        {/* ドック: 再生ボタンと進み具合 */}
        <div
          className={`flex items-center gap-1.5 border-t border-line-strong bg-surface ${isLarge ? "p-2" : "p-1.5"}`}
        >
          <span
            className="block shrink-0 rounded-full bg-accent"
            style={{ width: isLarge ? 21 : 15, height: isLarge ? 21 : 15 }}
          />
          <span className="block h-[2px] flex-1 bg-line-strong opacity-55" />
          <span
            className={`shrink-0 font-mono font-semibold text-fg-sub ${isLarge ? "text-[9px]" : "text-[7px]"}`}
          >
            3/5
          </span>
        </div>
      </div>
    </div>
  );
}
