import Link from "next/link";

import { Button } from "@/components/ui/button";
import StateMessage from "@/components/layout/state-message";
import { formatIrrAsToman } from "@/features/cart/utils/money";
import type { OrderSummary } from "../types";

export function OrderResult({ order, paid }: { order: OrderSummary; paid: boolean }) {
  const recipient = [order.recipient.firstName, order.recipient.lastName].filter(Boolean).join(" ") || "گیرنده سفارش";
  return (
    <div className="mx-auto max-w-[640px] [direction:rtl]">
      <StateMessage
        imageSrc={paid ? "/images/success-illustration.png" : "/images/illustration-failed.png"}
        title={paid ? "پرداخت با موفقیت انجام شد" : "پرداخت سفارش انجام نشد"}
        subtitle={paid ? `سفارش #${order.id.toLocaleString("fa-IR")} برای ${recipient} ثبت شد.` : "وضعیت سفارش را درگاه پرداخت تأیید نکرد. از ایجاد پرداخت تکراری خودداری کنید."}
        actions={<Button asChild size="large" variant="primary-filled"><Link href="/products">بازگشت به محصولات</Link></Button>}
      />
      <div className="mx-16 rounded-l border border-border-low-emphasis bg-surface-background p-16 text-label-14">
        <p className="flex justify-between"><span className="text-surface-neutral-mid-emphasis">مبلغ سفارش</span><strong>{formatIrrAsToman(order.total)}</strong></p>
        <p className="mt-12 flex justify-between"><span className="text-surface-neutral-mid-emphasis">وضعیت</span><strong>{order.status}</strong></p>
        {order.deliverySlot ? <p className="mt-12 flex justify-between gap-16"><span className="text-surface-neutral-mid-emphasis">بازه ارسال</span><strong className="text-left">{order.deliverySlot}</strong></p> : null}
      </div>
    </div>
  );
}
