/**
 * ネイティブ版の Tailwind。
 *
 * ■ Web版(ルートの Next.js)とはバージョンが違う
 * ルートは Tailwind v4(`@theme` と CSS 変数で10テーマを組んでいる)。
 * こちらは NativeWind v4 が前提とする **Tailwind v3** 系。node_modules は
 * 別なので競合しないが、`globals.css` のテーマ定義はそのままは持ち込めない。
 * テーマの移植は、色の定義を1か所に寄せてから別途行う。
 *
 * ■ content は src だけ
 * 画面(app/)も部品(components/)も src の下にある(Expo Router の既定)。
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
