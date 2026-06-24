// app/(front)/checkout/failure/page.tsx
import Header from "@/components/layout/Header/Header";
import Link from "next/link";
import Button from "@/components/ui/Button/Button";
import StateMessage from "@/components/layout/StateMessage/StateMessage";

export const dynamic = "force-dynamic";

export default async function FailurePage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const reason = (sp?.reason || "").toString();

  let desc =
    "پرداخت ناموفق بود. اگر مبلغی کسر شده باشد معمولاً طی دقایقی بازگشت می‌خورد.";
  if (reason === "cancelled") desc = "فرایند پرداخت توسط شما لغو شد.";
  if (reason === "network")
    desc = "در ارتباط با درگاه مشکلی رخ داد. لطفاً دوباره تلاش کنید.";
  if (reason === "verify-failed") desc = "تأیید پرداخت از سمت درگاه انجام نشد.";

  return (
    <div>
      <Header variant="internal" title="پرداخت ناموفق" backUrl="/checkout" />
      <div className="relative mx-auto bg-white mb-32" dir="rtl">
        <main className="px-6 max-w-[580px] mx-auto text-center">
          <StateMessage
            imageSrc="/images/illustration-failed.png"
            imageAlt="پرداخت ناموفق"
            title="پرداخت ناموفق بود"
            subtitle={desc}
          />
        </main>

        <div className="fixed left-0 right-0 bottom-0 p-4 pb-8 bg-white border-t border-border-mid grid z-[9999]" role="region" aria-label="CTA">
          <div className="w-full max-w-[580px] mx-auto">
            <div
              className="grid gap-3 grid-cols-2"
            >
              <Link href="/checkout">
                <Button type="primary" style="filled" fullWidth>
                  تلاش دوباره
                </Button>
              </Link>
              <Link href="/profile/orders">
                <Button type="tertiary" style="outline" fullWidth>
                  سفارش‌های من
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
