import { MARKER_SIZE } from "@/features/dancer/constants";

type Props = {
  name: string;
};

/**
 * ダンサー名のラベル。円の中に収まらない長さもあるため、円の下に
 * 常に正立するかたちで表示する(回転する本体とは別レイヤー)。
 * 背景チップは付けず、グリッド線の上でも読めるようテキストシャドウのみで
 * 視認性を確保している(参考にしているアプリに合わせた見た目)。
 */
export function DancerNameLabel({ name }: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[10px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]"
      style={{
        transform: `translate(-50%, 0%) translateY(${MARKER_SIZE / 2 + 4}px)`,
      }}
    >
      {name}
    </div>
  );
}
