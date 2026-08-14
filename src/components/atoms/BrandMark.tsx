/**
 * Choreon のブランドマーク。5人が山型に並んだ隊形そのもの。
 *
 * ロゴタイプではなく隊形にしてあるのは、初対面の人に「何のアプリか」を
 * 文字より先に伝えるため。色はダンサーの色をそのまま使うので、
 * テーマを変えるとマークの色も一緒に動く。
 *
 * ■ なぜ AuthScreen から切り出したか
 * 以前はログイン画面の中に直接書かれていた。起動画面(SplashScreen)でも
 * 同じマークを出すことになり、2箇所に同じ座標を書くと、片方だけ直して
 * 形がずれる。座標はここ1箇所にある。
 */

/**
 * 点の位置と色。奥から手前ではなく、左から右の並び。
 *
 * `scatter` は集合アニメーションの開始位置で、最終位置からの相対値。
 * 外から中央へ集まって見えるよう、左右の点は外側へ、真ん中の点は
 * 下へ大きく逃がしてある。`delay` は着地の順で、山の頂点(3番目)が
 * 最後に決まるようにしている — 頂点が最後だと、形が完成した瞬間が
 * はっきりする。
 *
 * 動き方そのもの(時間・曲線)は globals.css の brand-dot-in が持つ。
 * ここが持つのは「どこから来るか」だけ。
 */
const BRAND_DOTS = [
  { left: 0, top: 22, color: "var(--dancer-1)", scatter: [-70, 38], delay: 0 },
  { left: 22, top: 11, color: "var(--dancer-3)", scatter: [-34, -30], delay: 0.1 },
  { left: 44, top: 0, color: "var(--dancer-6)", scatter: [0, 52], delay: 0.2 },
  { left: 66, top: 11, color: "var(--dancer-4)", scatter: [34, -30], delay: 0.15 },
  { left: 88, top: 22, color: "var(--dancer-5)", scatter: [70, 38], delay: 0.05 },
] as const;

type Props = {
  /** true にすると、外から集まって隊形が組まれる */
  animated?: boolean;
  className?: string;
};

export function BrandMark({ animated = false, className = "" }: Props) {
  return (
    <span aria-hidden className={`relative block h-[31px] w-[97px] ${className}`}>
      {BRAND_DOTS.map((dot) => (
        <span
          key={dot.left}
          className={`absolute block h-[9px] w-[9px] rounded-full ${
            animated ? "brand-dot-in" : ""
          }`}
          style={
            {
              left: dot.left,
              top: dot.top,
              backgroundColor: dot.color,
              // 開始位置は transform で渡す。left/top を動かすと
              // レイアウトが毎フレーム再計算される
              ...(animated
                ? {
                    "--brand-dot-dx": `${dot.scatter[0]}px`,
                    "--brand-dot-dy": `${dot.scatter[1]}px`,
                    animationDelay: `${dot.delay}s`,
                  }
                : {}),
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
