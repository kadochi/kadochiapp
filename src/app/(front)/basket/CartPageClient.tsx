"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Button from "@/components/ui/Button/Button";
import InputStepper from "@/components/ui/InputStepper/InputStepper";
import StateMessage from "@/components/layout/StateMessage/StateMessage";

import { useSession } from "@/domains/auth/session-context";
import { useBasket } from "@/domains/basket/state/basket-context";

import s from "./cart.module.css";

type StoreProduct = {
  id: number;
  name: string;
  images?: { src?: string | null; alt?: string | null }[];
  prices?: {
    price?: string | null;
    sale_price?: string | null;
    regular_price?: string | null;
  };
};

type ViewProduct = { id: number; title: string; image: string; price: number };

function priceFromWP(p?: StoreProduct["prices"]) {
  const raw = p?.sale_price ?? p?.price ?? p?.regular_price ?? "0";
  const n = Number(raw || 0);
  return Number.isFinite(n) ? n : 0;
}

/** اگر /api/products نبود، مستقیم از استور API وردپرس می‌گیرد */
async function fetchProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  if (!ids.length) return [];

  // 1) تلاش با API داخلی
  const qs = new URLSearchParams({
    include: ids.join(","),
    per_page: String(ids.length),
    orderby: "include",
  });
  try {
    const r = await fetch(`/api/products?${qs.toString()}`, {
      cache: "no-store",
    });
    if (r.ok) {
      const data = (await r.json()) as unknown;
      return Array.isArray(data) ? (data as StoreProduct[]) : [];
    }
    // اگر 404 یا غیره بود می‌ریم سراغ fallback
  } catch {
    // ignore
  }

  // 2) fallback به Store API
  try {
    const WP_BASE =
      (process.env.NEXT_PUBLIC_WP_BASE_URL as string) ||
      "https://app.kadochi.com";
    const storeQs = new URLSearchParams({
      include: ids.join(","),
      per_page: String(ids.length),
      orderby: "include",
    });
    const r2 = await fetch(
      `${WP_BASE}/wp-json/wc/store/v1/products?${storeQs.toString()}`,
      { next: { revalidate: 0 } }
    );
    if (r2.ok) {
      const data = (await r2.json()) as unknown;
      return Array.isArray(data) ? (data as StoreProduct[]) : [];
    }
  } catch {
    // ignore
  }

  // اگر هر دو شکست خورد
  return [];
}

export default function CartPageClient() {
  const router = useRouter();
  const { session } = useSession();

  const { basket, addToBasket, setItemQuantity, removeFromBasket } =
    useBasket();

  const safeBasket = (
    basket && typeof basket === "object" ? basket : {}
  ) as Record<string, number>;

  const ids = useMemo(
    () => Object.keys(safeBasket).filter(Boolean),
    [safeBasket]
  );
  const idsKey = useMemo(() => ids.join(","), [ids]);

  const [items, setItems] = useState<ViewProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    let cancelled = false;
    if (!hydrated) return;

    async function run() {
      if (!ids.length) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const arr = await fetchProductsByIds(ids);
        if (cancelled) return;

        const mapped: ViewProduct[] = arr.map((p) => ({
          id: p.id,
          title: p.name,
          image: p.images?.[0]?.src || "/images/placeholder.png",
          price: priceFromWP(p.prices),
        }));
        setItems(mapped);

        // فقط وقتی پاکسازی کن که «واقعاً» چیزی گرفتیم
        if (mapped.length > 0) {
          const valid = new Set(mapped.map((m) => String(m.id)));
          for (const [k, v] of Object.entries(safeBasket)) {
            if (!valid.has(k) || v <= 0) {
              removeFromBasket(String(k), Number.POSITIVE_INFINITY);
            }
          }
        }
      } catch {
        if (!cancelled) setItems([]); // ولی پاکسازی سبد انجام نده
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]); // عمداً safeBasket رو توی deps نذاشتیم که لوپ نشه

  const lines = useMemo(() => {
    const byId = new Map(items.map((p) => [String(p.id), p]));
    return ids
      .map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        return { ...p, qty: safeBasket[id] ?? 0 };
      })
      .filter(Boolean) as Array<ViewProduct & { qty: number }>;
  }, [items, ids, safeBasket]);

  const handleProceed = async () => {
    setSubmitError("");
    if (!ids.length) return;

    setSubmitting(true);
    try {
      if (!session) {
        const qp = new URLSearchParams({ next: "/checkout" });
        router.push(`/login?${qp.toString()}`);
        return;
      }
      router.push("/checkout");
    } catch {
      setSubmitError("خطایی رخ داد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotalIrr = useMemo(
    () => lines.reduce((s, l) => s + l.price * l.qty, 0),
    [lines]
  );

  if (!hydrated || (loading && !items.length)) {
    return <div className={s.loadingCenter}>در حال بارگذاری…</div>;
  }

  if (!ids.length) {
    return (
      <div className={s.empty}>
        <StateMessage
          imageSrc="/images/empty-basket.png"
          imageAlt="سبد خالی"
          title="سبد خرید خالی است!"
          subtitle="در حال حاضر محصولی در سبد خرید خود اضافه نکرده‌اید."
          actions={
            <Button
              type="tertiary"
              style="outline"
              size="medium"
              className={s.emptyBtn}
            >
              مشاهده محصولات
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className={s.listWrap}>
        <ul className={s.list}>
          {lines.map((line) => (
            <li key={line.id} className={s.item}>
              <InputStepper
                type="basket"
                min={0}
                max={9}
                value={line.qty}
                onChange={(next) => {
                  const v = typeof next === "number" ? next : 0;
                  if (v <= 0) {
                    removeFromBasket(String(line.id), Number.POSITIVE_INFINITY);
                  } else {
                    setItemQuantity(String(line.id), v);
                  }
                }}
              />

              <div className={s.meta}>
                <div className={s.title}>{line.title}</div>
                <div className={s.price}>
                  {Math.round(line.price / 10).toLocaleString("fa-IR")}
                  <span className={s.currency}> تومان</span>
                </div>
              </div>

              <img src={line.image} alt={line.title} className={s.thumb} />
            </li>
          ))}
        </ul>
      </div>

      <div className={s.bottomBar} role="region" aria-label="جمع سبد">
        <div className={s.rowTop}>
          <div className={s.totalLabel}>جمع کل</div>
          <div className={s.totalVal}>
            {Math.round(subtotalIrr / 10).toLocaleString("fa-IR")}
            <span className={s.currency}> تومان</span>
          </div>
        </div>

        <div className={s.rowCta}>
          {submitError ? (
            <div className={s.errorMsg} role="alert">
              {submitError}
            </div>
          ) : null}

          <Button
            type="primary"
            style="filled"
            size="large"
            className={s.cta}
            onClick={handleProceed}
            disabled={submitting || !ids.length}
          >
            {submitting ? "در حال انتقال..." : "ادامه فرایند خرید"}
          </Button>
        </div>
      </div>
    </>
  );
}
