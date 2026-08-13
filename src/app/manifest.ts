import type { MetadataRoute } from "next";

/**
 * ホーム画面に置いたときの見え方(PWA)。
 *
 * ■ なぜ入れるのか
 * 稽古場で使う道具なので、ブラウザのタブを探して開くより、
 * ホーム画面のアイコンから1タップで開ける方が実際の使われ方に合う。
 * standalone にするとブラウザのアドレスバーが消え、その40px前後が
 * ステージの高さに返る(縦の余白がいちばん貴重、という前提と同じ理由)。
 *
 * ■ 色は既定テーマの値を直に書く
 * ここはCSS変数が届かない場所(OSが読む)。10テーマのうち、起動時に
 * OSが見せる地の色は既定のミッドナイトに合わせておく。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Choreon — ダンスフォーメーション",
    short_name: "Choreon",
    description:
      "紙の隊形図を、動く絵コンテに。曲に合わせて立ち位置と道順を作れます。",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#19191c",
    theme_color: "#19191c",
    lang: "ja",
    categories: ["productivity", "entertainment"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // マスクで丸く切られる端末向け。中身を安全域(中央66%)に収めてある
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
