import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کادوچی | ثبت سفارش",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
