// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";
import BottomNavigation from "@/components/layout/BottomNavigation/BottomNavigation";
import getInitialSession from "@/lib/auth/session";
import Footer from "@/components/layout/Footer/Footer";
import Script from "next/script";
import GATracker from "./ga-tracker";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://kadochi.com"),
  title: {
    default: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
    template: "کادوچی | %s",
  },
  description:
    "خرید آنلاین کادو، گل، شکلات و اکسسوری با ارسال سریع امروز. جستجوی کادوی مناسب برای تولد، سالگرد، ولنتاین و سایر مناسبت‌ها.",
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
    <html lang="fa-IR" dir="rtl">
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
        <Providers initialSession={session}>
          <GATracker />

          <div className="layoutContainer">
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
            <main className="page noHeaderPad">{children}</main>
            <BottomNavigation />
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
