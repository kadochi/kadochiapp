// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";
import Header from "@/components/layout/Header/Header";
import BottomNavigation from "@/components/layout/BottomNavigation/BottomNavigation";
import getInitialSession from "@/lib/auth/session";
import Footer from "@/components/layout/Footer/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://kadochi.com"),
  title: {
    default: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
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
    <html lang="فا" dir="rtl">
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
            {/* scroll-to-top on route changes, no client component needed */}
            <script
              id="scroll-restoration"
              dangerouslySetInnerHTML={{
                __html: `(function(){
  try{
    if('scrollRestoration' in history){ history.scrollRestoration='manual'; }
    var toTop=function(){ try{ window.scrollTo({top:0,left:0,behavior:'auto'}); }catch(e){} };
    var _push=history.pushState, _replace=history.replaceState;
    history.pushState=function(){ _push.apply(this, arguments); setTimeout(toTop,0); };
    history.replaceState=function(){ _replace.apply(this, arguments); setTimeout(toTop,0); };
    window.addEventListener('popstate', toTop);
    window.addEventListener('load', toTop);
  }catch(e){}
})();`,
              }}
            />
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
