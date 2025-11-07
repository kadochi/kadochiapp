// src/app/(front)/basket/page.tsx
import type { Metadata } from "next";
import HeaderInternal from "@/components/layout/Header/HeaderInternal";
import CartPageClient from "./CartPageClient";
import s from "./cart.module.css";

export const metadata: Metadata = {
  title: "سبد خرید | کادوچی",
};

export default function BasketPage() {
  return (
    <>
      <HeaderInternal title="سبد خرید" />
      <main className={s.container}>
        <CartPageClient />
      </main>
    </>
  );
}
