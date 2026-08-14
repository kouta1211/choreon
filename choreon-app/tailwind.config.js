/**
 * ネイティブ版の Tailwind。
 *
 * ■ Web版(ルートの Next.js)とはバージョンが違う
 * ルートは Tailwind v4(`@theme inline` で変数を色名に結び付けている)。
 * こちらは NativeWind v4 が前提とする **Tailwind v3** 系なので、同じことを
 * この config で書く。**色名は Web版と同じに揃えてある** —
 * `bg-surface` `text-fg-sub` `border-line` `bg-accent` と書けば、
 * 画面のコードはそのまま行き来できる。
 *
 * ■ 値は CSS 変数のまま渡す
 * ここで実値(#000 など)を書くと、テーマの差し替えができなくなる。
 * 変数を指すことで、`src/global.css` の :root を上書きするだけで
 * 10テーマに広げられる(Web版と同じ形)。
 *
 * ■ content は src だけ
 * 画面(app/)も部品(components/)も src の下にある(Expo Router の既定)。
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        page: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
          raised: "var(--surface-raised)",
          strong: "var(--surface-strong)",
        },
        stage: {
          DEFAULT: "var(--stage)",
          grid: "var(--stage-grid)",
          "grid-soft": "var(--stage-grid-soft)",
        },
        scrim: "var(--scrim)",
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        fg: {
          DEFAULT: "var(--text)",
          strong: "var(--text-strong)",
          sub: "var(--text-sub)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
          bright: "var(--accent-bright)",
          row: "var(--accent-row)",
        },
      },
      borderRadius: {
        stage: "12px",
      },
    },
  },
  plugins: [],
};
