import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import { Direction } from "radix-ui";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "../components/ui/toaster";
import { AuthProvider } from "../features/auth/auth-provider";
import { getStoredAuthToken } from "../features/auth/services/auth.server";
import { env } from "../lib/server/env";
import AddToHomeScreenPrompt from "./add-to-home-screen-prompt";
import GATracker from "./ga-tracker";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
  // Always swap the local Persian font in after the fallback paints.
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.KADOCHI_FRONTEND_URL),
  title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
  description: "کادوچی، فروشگاه آنلاین خرید کادو، گل و کیک با ارسال سریع و بسته‌بندی مخصوص هدیه.",
  applicationName: "کادوچی",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kadochi",
    statusBarStyle: "default",
  },
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Only the boolean is sent to the browser; the opaque WordPress JWT remains
  // in its HttpOnly cookie and is validated by the BFF after hydration.
  const hasStoredSession = Boolean(await getStoredAuthToken());

  return (
    <html lang="fa" dir="rtl" className={iranSans.variable}>
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="font-sans">
        <Direction.Provider dir="rtl">
          <AuthProvider hasStoredSession={hasStoredSession}>
            <Suspense fallback={null}>
              <GATracker />
            </Suspense>
            <AddToHomeScreenPrompt />
            <NextTopLoader
              showSpinner={false}
              color="#8030A2"
              height={4}
              crawl
              crawlSpeed={200}
              zIndex={2000}
            />
            <Toaster>{children}</Toaster>
          </AuthProvider>
        </Direction.Provider>
      </body>
    </html>
  );
}
