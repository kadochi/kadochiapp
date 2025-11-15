import { redirect } from "next/navigation";
import Header from "@/components/layout/Header/Header";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/api/woo";
import CheckoutClient from "./CheckoutClient";
import s from "./Checkout.module.css";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تکمیل سفارش",
};

export default async function CheckoutPage() {
  const session = await getSessionFromCookies();
  if (!session?.userId) redirect("/login?redirect=/checkout");

  let customer: Awaited<ReturnType<typeof getCustomerById>> = null;
  try {
    customer = await getCustomerById(session.userId);
  } catch {}

  const billing = customer?.billing ?? {};
  const initialFirstName =
    customer?.first_name || billing?.first_name || session.firstName || "";
  const initialLastName =
    customer?.last_name || billing?.last_name || session.lastName || "";
  const phoneValue = billing?.phone || session.phone || "";

  return (
    <div>
      <Header variant="internal" title="تکمیل اطلاعات" backUrl="/basket" />
      <main className={s.container} dir="rtl">
        <CheckoutClient
          initialFirstName={initialFirstName}
          initialLastName={initialLastName}
          phoneValue={phoneValue}
          userId={session.userId}
        />
      </main>
    </div>
  );
}
