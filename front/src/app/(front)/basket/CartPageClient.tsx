"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Button from "@/components/ui/Button/Button";
import InputStepper from "@/components/ui/InputStepper/InputStepper";
import StateMessage from "@/components/layout/StateMessage/StateMessage";

import { useSession } from "@/modules/auth/context/session-context";
import { useBasket } from "@/modules/basket";
import { tryGetPublicWpBaseUrl } from "@/config/wp";
import { cn } from "@/lib/cn";

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

async function fetchProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  if (!ids.length) return [];

  const qs = new URLSearchParams({
    include: ids.join(","),
    per_page: String(ids.length),
    orderby: "include",
  }).toString();

  try {
    const r = await fetch(`/api/wp/wp-json/wc/store/v1/products?${qs}`, {
      cache: "no-store",
    });
    if (r.ok) {
      const data = (await r.json()) as unknown;
      if (Array.isArray(data) && data.length) {
        const idSet = new Set(ids.map(String));
        return (data as StoreProduct[]).filter((p) => idSet.has(String(p?.id)));
      }
    }
  } catch {}

  try {
    const WP_BASE = tryGetPublicWpBaseUrl();
    if (!WP_BASE) return [];

    const r2 = await fetch(
      `${WP_BASE}/wp-json/wc/store/v1/products?${qs}`,
      { cache: "no-store" },
    );
    if (r2.ok) {
      const data = (await r2.json()) as unknown;
      if (Array.isArray(data) && data.length) {
        const idSet = new Set(ids.map(String));
        return (data as StoreProduct[]).filter((p) => idSet.has(String(p?.id)));
      }
    }
  } catch {}

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
    [safeBasket],
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

        if (mapped.length > 0) {
          const valid = new Set(mapped.map((m) => String(m.id)));
          for (const [k, v] of Object.entries(safeBasket)) {
            if (!valid.has(k) || v <= 0) {
              removeFromBasket(String(k), Number.POSITIVE_INFINITY);
            }
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]);

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
    let redirected = false;
    try {
      if (!session) {
        const qp = new URLSearchParams({ next: "/checkout" });
        router.push(`/login?${qp.toString()}`);
        redirected = true;
        return;
      }
      router.push("/checkout");
      redirected = true;
    } catch {
      setSubmitError("خطایی رخ داد. دوباره تلاش کنید.");
    } finally {
      if (!redirected) setSubmitting(false);
    }
  };

  const subtotalIrr = useMemo(
    () => lines.reduce((s, l) => s + l.price * l.qty, 0),
    [lines],
  );

  if (!hydrated || (ids.length > 0 && items.length === 0)) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-surface-neutral-mid">
        در حال به روزرسانی سبد خرید
      </div>
    );
  }

  if (!ids.length) {
    return (
      <div className="grid place-items-center gap-3 px-4 py-12 text-surface-neutral-mid">
        <StateMessage
          imageSrc="/images/empty-basket.png"
          imageAlt="سبد خالی"
          title="سبد خرید خالی است!"
          subtitle="در حال حاضر محصولی در سبد خرید خود اضافه نکرده‌اید."
          actions={
            <Button
              as={Link as any}
              href="/products"
              type="tertiary"
              style="outline"
              size="medium"
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
      <div className="mx-auto max-w-[580px] px-4 pb-[148px]">
        <ul className={cn("m-0 list-none gap-3 p-0", "grid")}>
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-row-reverse items-center gap-2 rounded-2xl border-b border-border-low bg-surface-background py-3"
            >
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

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="font-bold text-surface-neutral-high">{line.title}</div>
                <div className="text-surface-neutral-high">
                  {Math.round(line.price / 10).toLocaleString("fa-IR")}
                  <span className="ms-1 opacity-80"> تومان</span>
                </div>
              </div>

              <img
                src={line.image}
                alt={line.title}
                className="h-16 w-16 self-center rounded-xl object-cover bg-surface-background"
              />
            </li>
          ))}
        </ul>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[200] mx-auto border-t border-border-mid bg-surface-background px-4 pb-8 pt-4"
        role="region"
        aria-label="جمع سبد"
      >
        <div className="mx-auto mb-3 flex max-w-[580px] items-baseline justify-between">
          <div className="text-surface-neutral-mid">جمع کل</div>
          <div className="font-bold text-surface-neutral-high">
            {Math.round(subtotalIrr / 10).toLocaleString("fa-IR")}
            <span className="ms-1 opacity-80"> تومان</span>
          </div>
        </div>

        <div className="mx-auto block max-w-[580px]">
          {submitError ? (
            <div className="text-center text-error" role="alert">
              {submitError}
            </div>
          ) : null}

          <Button
            type="primary"
            style="filled"
            size="large"
            className="w-full"
            onClick={handleProceed}
            disabled={submitting || !ids.length}
            loading={submitting}
          >
            ادامه فرایند خرید
          </Button>
        </div>
      </div>
    </>
  );
}
