import { MARKER_SIZE } from "@/features/dancer/constants";

type Props = {
  name: string;
  /**
   * 丸の【上】へ出すか。既定は下。
   *
   * ステージのいちばん手前に立っている人は、下へ出すと名前が枠の外へ
   * はみ出して、すぐ外に置いてある札と重なる（実機の報告 06-14）。
   */
  above?: boolean;
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
export function DancerNameLabel({ name, above = false }: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-caption font-bold leading-none text-[var(--label-text)] [text-shadow:var(--label-shadow)]"
      style={{
        /* 下へ出すときは【鼻先】を避ける必要があるので広め、
           上は頭のふちだけなので詰める（実機の報告 06-13）。
           MARKER_SIZE の半分は当たり判定の半径で、頭そのものは
           その半分しかない — 同じ数字を使うと上だけ離れて見える */
        transform: above
          ? `translate(-50%, -100%) translateY(${-(MARKER_SIZE / 4 + 4)}px)`
          : `translate(-50%, 0%) translateY(${MARKER_SIZE / 2 + 4}px)`,
      }}
    >
      {name}
    </div>
  );
}
