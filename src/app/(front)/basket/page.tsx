// src/app/(front)/basket/page.tsx
import type { Metadata } from "next";
import Header from "@/components/layout/Header/Header";
import CartPageClient from "./CartPageClient";
import s from "./cart.module.css";

export const metadata: Metadata = {
  title: "سبد خرید | کادوچی",
};

export default function BasketPage() {
  return (
    <>
      <Header variant="internal" title="سبد خرید" backUrl="" />
      <main className={s.container}>
        <CartPageClient />
      </main>
    </>
  );
}
