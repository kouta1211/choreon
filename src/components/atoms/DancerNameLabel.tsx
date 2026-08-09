import { MARKER_SIZE } from "@/features/dancer/constants";

type Props = {
  name: string;
};

/**
 * ダンサー名のラベル。円の中に収まらない長さもあるため、円の下に
 * 常に正立するかたちで表示する(回転する本体とは別レイヤー)。
 * 背景チップは付けず、グリッド線の上でも読めるようテキストシャドウのみで
 * 視認性を確保している(参考にしているアプリに合わせた見た目)。
 *
 * 文字と影の色はテーマが持つ(--label-text / --label-shadow)。暗いテーマでは
 * 白文字＋黒影、紙のような明るいテーマでは黒文字＋白影に自動で反転する。
 * 白文字のままだと紙の上で消えてしまうため。
 */
export function DancerNameLabel({ name }: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[10px] font-bold leading-none text-[var(--label-text)] [text-shadow:var(--label-shadow)]"
      style={{
        transform: `translate(-50%, 0%) translateY(${MARKER_SIZE / 2 + 4}px)`,
      }}
    >
      {name}
    </div>
  );
}
