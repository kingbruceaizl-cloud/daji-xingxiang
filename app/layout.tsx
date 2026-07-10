import type { Metadata } from "next";
import { Montserrat, Noto_Sans_SC } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "大吉形象",
    template: "%s｜大吉形象",
  },
  description: "面向形象顾问的 AI 形象设计与变装视频工作台",
  applicationName: "大吉形象",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/daji-favicon.png",
    apple: "/brand/daji-favicon.png",
  },
  openGraph: {
    title: "大吉形象",
    description: "中文 AI 形象设计、商品搭配和变装视频工作台",
    siteName: "大吉形象",
    locale: "zh_CN",
    type: "website",
  },
};

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  display: "swap",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${montserrat.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
