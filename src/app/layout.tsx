import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toast } from "@/components/organisms/Toast";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { AuthDialog } from "@/components/organisms/AuthDialog";
import { THEME_INIT_SCRIPT } from "@/features/theme/themeScript";
import { ServiceWorkerRegistrar } from "@/components/atoms/ServiceWorkerRegistrar";
import { SplashScreen } from "@/components/organisms/SplashScreen";
import { SettingsLoader } from "@/components/atoms/SettingsLoader";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { getLocale, getMessages } from "@/features/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return {
    metadataBase: new URL(siteUrl),
    title: "Choreon",
    description: t.app.description,
    // iOS はマニフェストのアイコンを読まないので、こちらでも渡す
    icons: { apple: "/apple-icon.png" },
    // 共有リンクはチャットに貼って渡すもの。ここが無いと、受け取る側には
    // 長いURLの文字列だけが出る(絵は app/opengraph-image.tsx が作る)
    openGraph: {
      type: "website",
      siteName: "Choreon",
      title: "Choreon",
      description: t.app.description,
      locale: t.app.ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Choreon",
      description: t.app.description,
    },
  appleWebApp: {
      capable: true,
      title: "Choreon",
      // 上端まで地の色を伸ばす。ステータスバーの下に別の色の帯が出ると、
      // 画面が2枚に割れて見える
      statusBarStyle: "black-translucent",
    },
  };
}

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

/**
 * 言語を Cookie から読むので、ここから下は全部リクエストごとの描画になる
 * (ログイン・登録・オフラインの3枚は、それまで静的に焼けていた)。
 * 小さい画面ばかりなので焼けなくなる損は小さく、
 * **最初の1バイト目から正しい言語で出ること**の方が値打ちがある。
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // data-theme / data-texture は下のスクリプトが描画前に書き込む。
      // サーバーは端末の選択を知らないので、ここだけは食い違って当然
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>
          {/* 名乗る一拍。children より先に書いてあるのは順序の意味ではなく
              (fixed で全面を覆うので位置は関係ない)、読んだときに
              「まずこれが出る」と分かるようにするため */}
          <SplashScreen />
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
        </LocaleProvider>
      </body>
    </html>
  );
}
