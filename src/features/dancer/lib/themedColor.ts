import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";

/**
 * 保存されているダンサーの色を、いまのテーマ用の色に読み替える。
 *
 * ダンサーの色は6色パレットの16進数そのままでSupabaseに保存している。
 * これは表示のための値であると同時に「どの色チップが選ばれているか」を
 * 照合する実データでもあるので、保存側をCSS変数にすることはできない
 * (`var(--dancer-1)` がDBに入ってしまい、色チップの一致判定も壊れる)。
 *
 * そこで読み替えは描画のときだけ行う。パレットの何番目かを見て
 * 対応する `--dancer-N` を返すので、紙のテーマなら紙用の6色、黒板なら
 * チョークの6色が、保存データを一切書き換えずにそのまま効く。
 * 役割と順番(青/赤/緑/琥珀/紫/桃)はテーマが変わっても保たれる。
 *
 * パレットに無い色(将来ユーザーが自由に色を選べるようにした場合)は
 * そのまま返す。テーマ側に対応する変数が無いため。
 */
export function themedDancerColor(color: string): string {
  const index = DANCER_COLOR_PALETTE.indexOf(color);
  return index === -1 ? color : `var(--dancer-${index + 1})`;
}
