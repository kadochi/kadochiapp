import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/api/woo";
import Header from "@/components/layout/Header/Header";
import InfoForm from "./InfoForm";
import s from "./info.module.css";

export const metadata: Metadata = {
  title: "کادوچی | اطلاعات حساب کاربری",
  description: "مشاهده و ویرایش اطلاعات حساب کاربری شما در کادوچی",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server Component: Profile Info Page */
export default async function ProfileInfoPage() {
  const session = await getSessionFromCookies();
  if (!session?.userId) redirect("/login?redirect=/profile/info");

  // Get WooCommerce Customer Data
  let customer: any = null;
  try {
    customer = await getCustomerById(session.userId);
  } catch {
    customer = null;
  }

  const billing = customer?.billing ?? {};
  const initialFirstName =
    customer?.first_name || billing?.first_name || session.firstName || "";
  const initialLastName =
    customer?.last_name || billing?.last_name || session.lastName || "";
  const initialEmail = customer?.email || billing?.email || "";
  const phoneValue = billing?.phone || session.phone || "";

  return (
    <div className={s.container} dir="rtl">
      <Header variant="internal" title="اطلاعات حساب کاربری" backUrl="" />

      <InfoForm
        initialFirstName={initialFirstName}
        initialLastName={initialLastName}
        phoneValue={phoneValue}
        initialEmail={initialEmail}
      />
    </div>
  );
}
