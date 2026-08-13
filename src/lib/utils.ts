import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を1つにまとめる(shadcn/ui の標準ヘルパー)。
 *
 * ■ なぜ単なる連結ではないのか
 * 呼び出し側が `className` で見た目を上書きする作りにしているので、
 * `px-3` と `px-4` のように同じ役割のクラスが両方残ると、勝つ方が
 * Tailwind の生成順という【書いた場所と関係ない理由】で決まる。
 * twMerge は後から渡された方を残して、前のものを落とす。
 *
 * ■ Choreon での使い方
 * 見た目の値は必ずテーマトークン(--accent / --surface など)を経由させる。
 * shadcn/ui の既定クラス(bg-background / text-foreground)をそのまま
 * 持ち込むと、10テーマの塗り分けと二重の仕組みになる。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
