// src/app/(front)/profile/orders/[orderId]/OrderDetailClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header/Header";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Label from "@/components/ui/Label/Label";
import Divider from "@/components/ui/Divider/Divider";
import ProgressStepper, {
  type StepItem,
} from "@/components/ui/ProgressStepper/ProgressStepper";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Button from "@/components/ui/Button/Button";
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

function toman(n?: number) {
  const v = Math.round((Number(n) || 0) / 10);
  return v.toLocaleString("fa-IR");
}

function statusToUi(st: OrderDetailData["status"]) {
  if (st === "completed")
    return { chip: { type: "secondary", text: "تحویل‌شده" }, step: 4 };
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
      <Header
        variant="internal"
        title="جزئیات سفارش"
        backUrl="/profile/orders"
      />
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
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(!initialData);
  const lastReqId = useRef(0);
  const lastLoadedAt = useRef<number>(initialData ? Date.now() : 0);

  async function fetchDetailWithRetry(signal: AbortSignal) {
    let attempt = 0;
    while (attempt < 3) {
      try {
        const r = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal,
          keepalive: true,
        });
        if (r.status === 404) throw new Error("not_found");
        if (r.status === 401) throw new Error("unauthorized");
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error(`http_${r.status}`);
        return (await r.json()) as OrderDetailData;
      } catch (e: any) {
        attempt++;
        if (signal.aborted) throw e;
        const msg = String(e?.message || "");
        if (["not_found", "unauthorized", "forbidden"].includes(msg)) throw e;
        if (attempt >= 3) throw e;
        await new Promise((res) => setTimeout(res, attempt === 1 ? 400 : 1200));
      }
    }
    throw new Error("failed");
  }

  useEffect(() => {
    const reqId = ++lastReqId.current;
    const ctl = new AbortController();
    if (!initialData) {
      setLoading(true);
    }
    setErr("");

    fetchDetailWithRetry(ctl.signal)
      .then((d) => {
        if (reqId !== lastReqId.current) return;
        setData(d);
        lastLoadedAt.current = Date.now();
      })
      .catch((e) => {
        if (reqId !== lastReqId.current) return;
        if (!initialData) setErr(String(e?.message || "error"));
      })
      .finally(() => {
        if (reqId === lastReqId.current) setLoading(false);
      });

    return () => ctl.abort();
  }, [orderId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        const age = Date.now() - (lastLoadedAt.current || 0);
        if (age > 30_000) {
          const ctl = new AbortController();
          const reqId = ++lastReqId.current;
          setErr("");
          fetchDetailWithRetry(ctl.signal)
            .then((d) => {
              if (reqId !== lastReqId.current) return;
              setData(d);
              lastLoadedAt.current = Date.now();
            })
            .catch(() => {})
            .finally(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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

  if (loading && !data) return <OrderDetailSkeleton />;

  if (err && !data) {
    const isAuth = err === "unauthorized" || err === "forbidden";
    const is404 = err === "not_found";
    return (
      <div className={s.page} dir="rtl">
        <Header
          variant="internal"
          title="جزئیات سفارش"
          backUrl="/profile/orders"
        />
        <StateMessage
          imageSrc={is404 ? "/images/empty.png" : "/images/error-generic.png"}
          title={
            is404
              ? "سفارش پیدا نشد"
              : isAuth
              ? "دسترسی غیرمجاز"
              : "خطا در بارگذاری"
          }
          subtitle={
            is404
              ? "سفارش مورد نظر وجود ندارد."
              : isAuth
              ? "لطفاً وارد حساب کاربری شوید یا دسترسی خود را بررسی کنید."
              : "لطفاً دوباره تلاش کنید."
          }
          actions={
            !isAuth && !is404 ? (
              <Button
                as="button"
                type="secondary"
                style="filled"
                size="small"
                onClick={() => {
                  const ctl = new AbortController();
                  const reqId = ++lastReqId.current;
                  setLoading(true);
                  setErr("");
                  fetchDetailWithRetry(ctl.signal)
                    .then((d) => {
                      if (reqId !== lastReqId.current) return;
                      setData(d);
                      lastLoadedAt.current = Date.now();
                    })
                    .catch((e) => setErr(String(e?.message || "error")))
                    .finally(() => setLoading(false));
                }}
                aria-label="تلاش مجدد"
              >
                تلاش مجدد
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const ui = statusToUi(data.status);
  const rtlSteps = useMemo(() => buildSteps3(ui.step).reverse(), [ui.step]);

  return (
    <div className={s.page} dir="rtl">
      <Header
        variant="internal"
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
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  if (!el.src.endsWith("/images/placeholder.svg"))
                    el.src = "/images/placeholder.svg";
                }}
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
