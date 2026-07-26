import type { Metadata } from "next";
import localFont from "next/font/local";
import { Direction } from "radix-ui";
import { Toaster } from "../components/ui/toaster";
import { AuthProvider } from "../features/auth/auth-provider";
import { env } from "../lib/server/env";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const iranSans = localFont({
  src: [
    {
      path: "./IRANSansXFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./IRANSansXFaNum-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./IRANSansXFaNum-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-iran-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.KADOCHI_FRONTEND_URL),
  title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
  description: "کادوچی، فروشگاه آنلاین خرید کادو، گل و کیک با ارسال سریع و بسته‌بندی مخصوص هدیه.",
  applicationName: "کادوچی",
  category: "shopping",
  openGraph: {
    locale: "fa_IR",
    siteName: "کادوچی",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={iranSans.variable}>
      <body className="font-sans">
        <Direction.Provider dir="rtl">
          <AuthProvider>
            <Toaster>{children}</Toaster>
          </AuthProvider>
        </Direction.Provider>
      </body>
    </html>
  );
}
