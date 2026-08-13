import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toast } from "@/components/organisms/Toast";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { AuthDialog } from "@/components/organisms/AuthDialog";
import { THEME_INIT_SCRIPT } from "@/features/theme/themeScript";
import { ServiceWorkerRegistrar } from "@/components/atoms/ServiceWorkerRegistrar";
import { SettingsLoader } from "@/components/atoms/SettingsLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION = "スマートフォンで作る、ダンスのフォーメーション";

/**
 * リンクを絶対URLに直すための土台。
 *
 * これが無いと openGraph の画像が相対パスのまま出て、チャットアプリが
 * 絵を取りに行けない。Vercel が渡してくれる本番のホスト名を既定にして、
 * 手元では localhost に落とす(独自ドメインを取ったら
 * NEXT_PUBLIC_SITE_URL で上書きする)。
 *
 * VERCEL_URL ではなく VERCEL_PROJECT_PRODUCTION_URL を見ているのは、
 * 前者がデプロイごとに変わる使い捨てのURLで、貼られたリンクの寿命より
 * 先に消えるため。
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Choreon",
  description: DESCRIPTION,
  // iOS はマニフェストのアイコンを読まないので、こちらでも渡す
  icons: { apple: "/apple-icon.png" },
  // 共有リンクはチャットに貼って渡すもの。ここが無いと、受け取る側には
  // 長いURLの文字列だけが出る(絵は app/opengraph-image.tsx が作る)
  openGraph: {
    type: "website",
    siteName: "Choreon",
    title: "Choreon",
    description: DESCRIPTION,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Choreon",
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "Choreon",
    // 上端まで地の色を伸ばす。ステータスバーの下に別の色の帯が出ると、
    // 画面が2枚に割れて見える
    statusBarStyle: "black-translucent",
  },
};

/**
 * 端末のUI(ステータスバー・アドレスバー)の色。
 *
 * `viewport-fit=cover` は、iPhone の丸い角と下端のバーの下まで
 * 地を伸ばすための指定。これが無いと `env(safe-area-inset-bottom)` が
 * 常に 0 になり、ドックが下端に貼り付いてしまう。
 */
export const viewport: Viewport = {
  themeColor: "#19191c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // data-theme / data-texture は下のスクリプトが描画前に書き込む。
      // サーバーは端末の選択を知らないので、ここだけは食い違って当然
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* 画面をまたいで使う重ね物はここで1回だけ描く。
            以前はエディタ画面だけがToastを持っていたため、プロジェクト一覧の
            失敗はページ内のテキストで知らせる、という別扱いになっていた */}
        <Toast />
        <ConfirmDialog />
        <AuthDialog />
        {/* 圏外でも、一度開いた画面は出るようにする(public/sw.js)。
            画面には何も出さない */}
        <ServiceWorkerRegistrar />
        {/* 端末に覚えてある設定を読む。画面には何も出さない */}
        <SettingsLoader />
      </body>
    </html>
  );
}
