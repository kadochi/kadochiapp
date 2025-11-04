// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";
import Header from "@/components/layout/Header/Header";
import BottomNavigation from "@/components/layout/BottomNavigation/BottomNavigation";
import getInitialSession from "@/domains/auth/getInitialSession";
import Footer from "@/components/layout/Footer/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://kadochi.com"),
  title: {
    default: "کادوچی | خرید اینترنتی کادو و گل با ارسال سریع",
    template: "کادوچی | %s",
  },
  description:
    "خرید آنلاین کادو، گل، شکلات و اکسسوری با ارسال سریع امروز. جستجوی کادوی مناسب برای تولد، سالگرد، ولنتاین و سایر مناسبت‌ها.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "https://kadochi.com/",
    siteName: "کادوچی",
    title: "کادوچی | خرید اینترنتی کادو و گل با ارسال سریع",
    description:
      "خرید آنلاین کادو، گل، شکلات و اکسسوری با ارسال سریع امروز. جستجوی کادوی مناسب برای هر مناسبت.",
    images: [
      { url: "/og/kadochi-home.jpg", width: 1200, height: 630, alt: "کادوچی" },
    ],
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "کادوچی | خرید اینترنتی کادو",
    description: "کادو برای همه مناسبت‌ها با ارسال سریع.",
    images: ["/og/kadochi-home.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getInitialSession();

  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://app.kadochi.com" crossOrigin="" />
        <link
          rel="preload"
          href="/fonts/IRANSansXFaNum-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IRANSansXFaNum-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IRANSansXFaNum-ExtraBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <main className="layoutContainer">
          <Providers initialSession={session}>
            <NextTopLoader
              showSpinner={false}
              color="#8030A2"
              height={4}
              crawl
              crawlSpeed={200}
              zIndex={2000}
            />
            <Header />
            <div className="page noHeaderPad">{children}</div>
            <BottomNavigation />
          </Providers>
        </main>
        <Footer />
      </body>
    </html>
  );
}
