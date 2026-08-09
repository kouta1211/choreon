import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toast } from "@/components/organisms/Toast";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { AuthDialog } from "@/components/organisms/AuthDialog";
import { THEME_INIT_SCRIPT } from "@/features/theme/themeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // TODO: MVP開発中のプレースホルダー。実際のコピーが決まったら差し替える
  title: "Choreon",
  description: "スマートフォンに最適化されたダンスフォーメーション作成アプリ",
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
      </body>
    </html>
  );
}
