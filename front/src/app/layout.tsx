import type { Metadata } from "next";
import localFont from "next/font/local";
import { Direction } from "radix-ui";
import { Toaster } from "../components/ui/toaster";
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
  title: "Kadochi",
  description: "فرانت‌اند هدلس وردپرس"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={iranSans.variable}>
      <body className="font-sans">
        <Direction.Provider dir="rtl">
          <Toaster>{children}</Toaster>
        </Direction.Provider>
      </body>
    </html>
  );
}
