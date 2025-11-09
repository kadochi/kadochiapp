"use client";

import { useEffect, useMemo, useState } from "react";
import HeaderInternal from "@/components/layout/Header/HeaderInternal";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Label from "@/components/ui/Label/Label";
import Divider from "@/components/ui/Divider/Divider";
import ProgressStepper, {
  type StepItem,
} from "@/components/ui/ProgressStepper/ProgressStepper";
import s from "./order-detail.module.css";

export type OrderDetailData = {
  id: string | number;
  status:
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "canceled"
    | "refunded"
    | "failed"
    | "draft";
  created_at: string;
  sender?: string;
  receiver?: string;
  delivery_window?: string;
  address?: string;
  items?: { id: string | number; name?: string; image?: string }[];
  summary?: {
    subtotal?: number;
    tax?: number;
    shipping?: number;
    service?: number;
    total?: number;
  };
};

function toman(n: number | undefined) {
  const v = Math.round(((n ?? 0) as number) / 10);
  return v.toLocaleString("fa-IR");
}

function statusToUi(st: OrderDetailData["status"]) {
  if (st === "completed")
    return { chip: { type: "secondary", text: "تحویل‌شده" }, step: 3 };
  if (st === "processing")
    return { chip: { type: "primary", text: "در حال آماده‌سازی" }, step: 2 };
  if (st === "on-hold")
    return { chip: { type: "warning", text: "در حال بررسی" }, step: 1 };
  if (st === "pending")
    return { chip: { type: "danger", text: "در انتظار پرداخت" }, step: 0 };
  return { chip: { type: "deactive", text: "لغو شده" }, step: 0 };
}

function buildSteps3(current: number): StepItem[] {
  return [
    {
      label: "بررسی",
      status: current > 1 ? "done" : current === 1 ? "current" : "todo",
    },
    {
      label: "آماده‌سازی",
      status: current > 2 ? "done" : current === 2 ? "current" : "todo",
    },
    {
      label: "تحویل",
      status: current > 3 ? "done" : current === 3 ? "current" : "todo",
    },
  ];
}

function OrderDetailSkeleton() {
  return (
    <div className={s.page} dir="rtl">
      <HeaderInternal title="جزئیات سفارش" backUrl="/profile/orders" />

      <div className={s.stepperOuter}>
        <div className={s.stepperInner}>
          <div className={s.skelStepper} />
        </div>
      </div>

      <div className={s.section}>
        <div className={s.skelTitle} />
        <div className={s.skelSub} />
      </div>

      <Divider type="spacer" />

      <div className={s.section}>
        <div className={s.skelTitle} />
        <div className={s.skelSub} />
      </div>
      <div className={s.kvWrap}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className={s.detailRow}>
              <div className={s.skelLineShort} />
              <div className={s.skelLineLong} />
            </div>
            {i < 3 && <Divider />}
          </div>
        ))}
      </div>

      <Divider type="spacer" />

      <div className={s.section}>
        <div className={s.skelTitle} />
        <div className={s.skelSub} />
      </div>
      <div className={s.section}>
        <div className={s.itemsRow}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={s.skelThumb} />
          ))}
        </div>
      </div>

      <Divider type="spacer" />

      <div className={s.sectionHeaderOnly}>
        <div className={s.skelTitle} />
        <div className={s.skelSub} />
      </div>
      <div className={s.kvWrap}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className={s.detailRow}>
              <div className={s.skelLineShort} />
              <div className={s.skelLineLong} />
            </div>
            {i < 4 && <Divider />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailClient({
  orderId,
  initialData,
}: {
  orderId: string;
  initialData?: OrderDetailData;
}) {
  const [data, setData] = useState<OrderDetailData | undefined>(initialData);

  useEffect(() => {
    if (initialData) return;
    const ctl = new AbortController();
    fetch(`/api/orders/${orderId}`, { cache: "no-store", signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
    return () => ctl.abort();
  }, [orderId, initialData]);

  const createdDateTime = useMemo(() => {
    try {
      const d = new Date(data?.created_at ?? Date.now());
      const date = d.toLocaleDateString("fa-IR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const time = d
        .toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
        .replace("٫", ":");
      return `${date} • ${time}`;
    } catch {
      return data?.created_at ?? "";
    }
  }, [data?.created_at]);

  const ui = statusToUi(data?.status ?? "pending");
  const steps = buildSteps3(ui.step);
  const rtlSteps = useMemo(() => steps.slice().reverse(), [steps]);

  if (!data) return <OrderDetailSkeleton />;

  return (
    <div className={s.page} dir="rtl">
      <HeaderInternal
        title={`جزئیات سفارش #${orderId}`}
        backUrl="/profile/orders"
      />

      <div className={s.stepperOuter}>
        <div className={s.stepperInner}>
          <ProgressStepper steps={rtlSteps} showIndex={false} />
        </div>
      </div>

      <SectionHeader
        title={`شماره سفارش: #${orderId}`}
        subtitle={createdDateTime}
        leftSlot={
          <Label type={ui.chip.type as any} style="tonal" size="medium">
            {ui.chip.text}
          </Label>
        }
      />

      <Divider type="spacer" />

      <SectionHeader title="جزئیات ارسال" subtitle="مشخصات فرستنده و گیرنده" />
      <div className={s.kvWrap}>
        <div className={s.detailRow}>
          <div className={s.detailKey}>فرستنده</div>
          <div className={s.detailVal}>{data.sender ?? "—"}</div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>گیرنده</div>
          <div className={s.detailVal}>{data.receiver ?? "—"}</div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>زمان ارسال</div>
          <div className={s.detailVal}>{data.delivery_window ?? "—"}</div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>آدرس گیرنده</div>
          <div className={s.detailVal}>{data.address ?? "—"}</div>
        </div>
      </div>

      <Divider type="spacer" />

      <SectionHeader title="اقلام سفارش" subtitle="لیست محصولات" />
      <div className={s.section}>
        <div className={s.itemsRow}>
          {(data.items ?? []).slice(0, 8).map((it) => (
            <div key={it.id} className={s.thumb}>
              <img
                src={it.image || "/images/placeholder.svg"}
                alt={it.name ?? ""}
              />
            </div>
          ))}
        </div>
      </div>

      <Divider type="spacer" />

      <div className={s.sectionHeaderOnly}>
        <SectionHeader
          title="جزئیات پرداخت"
          subtitle="مشخصات هزینه‌های سفارش"
        />
      </div>
      <div className={s.kvWrap}>
        <div className={s.detailRow}>
          <div className={s.detailKey}>جمع سفارش‌ها</div>
          <div className={s.detailVal}>
            {toman(data.summary?.subtotal)} تومان
          </div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>۱۰٪ مالیات بر ارزش افزوده</div>
          <div className={s.detailVal}>{toman(data.summary?.tax)} تومان</div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>هزینه ارسال</div>
          <div className={s.detailVal}>
            {data.summary?.shipping
              ? `${toman(data.summary.shipping)} تومان`
              : "رایگان"}
          </div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>هزینه بسته‌بندی و خدمات</div>
          <div className={s.detailVal}>
            {toman(data.summary?.service)} تومان
          </div>
        </div>
        <Divider />
        <div className={s.detailRow}>
          <div className={s.detailKey}>جمع کل</div>
          <div className={s.detailValBold}>
            {toman(data.summary?.total)} تومان
          </div>
        </div>
      </div>
    </div>
  );
}
