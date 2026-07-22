"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, RefreshCw, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import SectionHeader from "@/components/layout/section-header";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";
import { updateProductAction } from "@/features/products/services/products";
import type { Product } from "@/features/products/types";
import { getPersonalProfile, listProfileProducts } from "../services/profile";
import type { PersonalProfile, ProfileProductAction } from "../types";

const pageCopy = {
  save: {
    title: "لیست آرزوها",
    emptyTitle: "لیست آرزوهای شما خالی است",
    emptySubtitle: "محصول‌هایی که ذخیره می‌کنید، برای دسترسی سریع‌تر اینجا می‌مانند.",
    Icon: Bookmark,
    countLabel: "ذخیره‌شده",
    removeLabel: "حذف از لیست آرزوها",
  },
  like: {
    title: "مورد علاقه‌ها",
    emptyTitle: "هنوز محصولی را نپسندیده‌اید",
    emptySubtitle: "محصول‌هایی که می‌پسندید، برای دیدن دوباره اینجا جمع می‌شوند.",
    Icon: Heart,
    countLabel: "مورد علاقه",
    removeLabel: "حذف از مورد علاقه‌ها",
  },
} as const;

function ProductActionsLoading() {
  return (
    <div className="grid grid-cols-2 gap-16 px-16 pb-24 pt-8 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1024px]:gap-20" aria-label="در حال بارگذاری محصولات">
      {Array.from({ length: 6 }, (_, index) => <ProductCardSkeleton key={index} />)}
    </div>
  );
}

function ProductActionGrid({
  action,
  products,
  removingId,
  onRemove,
}: Readonly<{
  action: ProfileProductAction;
  products: Product[];
  removingId: number | null;
  onRemove: (product: Product) => void;
}>) {
  const copy = pageCopy[action];

  return (
    <section aria-label={copy.title} className="grid grid-cols-2 gap-x-12 gap-y-24 px-16 pb-24 pt-8 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-5 min-[1024px]:gap-x-20 min-[1024px]:gap-y-28">
      {products.map((product, index) => {
        const isRemoving = removingId === product.id;
        return (
          <article className="relative min-w-0" key={product.id}>
            <ProductCard priority={index === 0} product={product} />
            <button
              aria-label={`${copy.removeLabel}: ${product.name}`}
              className="absolute left-8 top-8 inline-flex size-40 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/90 p-0 text-surface-neutral-high-emphasis shadow-sm backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
              disabled={isRemoving}
              onClick={() => onRemove(product)}
              type="button"
            >
              {isRemoving ? <span aria-hidden className="size-20 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <X aria-hidden className="size-20" />}
            </button>
          </article>
        );
      })}
    </section>
  );
}

export function ProfileProductActionsPage({ action }: { action: ProfileProductAction }) {
  const router = useRouter();
  const { status } = useAuth();
  const { toast } = useToast();
  const copy = pageCopy[action];
  const CollectionIcon = copy.Icon;
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [personalProfile, setPersonalProfile] = useState<PersonalProfile | null>(null);
  const [personalProfileLoading, setPersonalProfileLoading] = useState(action === "save");

  const loadPage = useCallback(async (requestedPage: number, append = false) => {
    setLoading(true);
    setError(false);
    try {
      const result = await listProfileProducts(action, requestedPage);
      setProducts((current) => append ? [...current, ...result.items] : result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void loadPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage, status]);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=/profile/${action === "save" ? "wishlist" : "favorites"}`);
  }, [action, router, status]);

  useEffect(() => {
    if (action !== "save" || status !== "authenticated") return;
    let cancelled = false;
    void getPersonalProfile()
      .then((next) => {
        if (!cancelled) setPersonalProfile(next);
      })
      .catch(() => {
        if (!cancelled) setPersonalProfile(null);
      })
      .finally(() => {
        if (!cancelled) setPersonalProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [action, status]);

  const canLoadMore = page > 0 && page < totalPages;

  const removeProduct = useCallback(async (product: Product) => {
    setRemovingId(product.id);
    try {
      await updateProductAction(product.id, action, false);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setTotal((current) => Math.max(0, current - 1));
      toast({ tone: "success", title: pageCopy[action].removeLabel });
    } catch {
      toast({ tone: "error", title: "حذف محصول انجام نشد", description: "لطفاً دوباره تلاش کنید." });
    } finally {
      setRemovingId(null);
    }
  }, [action, toast]);

  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header backUrl="/profile" title={copy.title} variant="internal" />
      <main className="mx-auto w-full max-w-[1200px]">
        {action === "save" && status === "authenticated" ? (
          <SectionHeader
            as="h2"
            subtitle="لیست آرزوهاتو با دوستات به اشتراک بگذار"
            title="پروفایل شخصی"
            leftSlot={
              <Button
                asChild={!personalProfileLoading}
                disabled={personalProfileLoading}
                size="small"
                variant="secondary-filled"
              >
                {personalProfileLoading ? "در حال بارگذاری…" : (
                  <Link href="/profile/wishlist/personal-profile">
                    {personalProfile?.username ? <Settings aria-hidden /> : null}
                    {personalProfile?.username ? "تنظیمات پروفایل" : "ایجاد پروفایل"}
                  </Link>
                )}
              </Button>
            }
          />
        ) : null}
        {status === "authenticated" && !loading && !error && products.length ? (
          <div className="flex items-center px-16 pb-8 pt-20">
            <p className="inline-flex items-center gap-6 m-0 text-body-14 text-surface-neutral-mid-emphasis"><CollectionIcon aria-hidden className="size-16 text-primary" />{total.toLocaleString("fa-IR")} {copy.countLabel}</p>
          </div>
        ) : null}
        {status === "loading" || (loading && !products.length) ? <ProductActionsLoading /> : null}
        {status === "anonymous" ? (
          <StateMessage imageSrc="/images/login-illustration.png" subtitle={`برای دیدن ${copy.title} وارد حساب کاربری خود شوید.`} title="ورود لازم است" />
        ) : null}
        {status === "error" || (error && !products.length) ? (
          <StateMessage
            actions={<Button onClick={() => void loadPage(1)} variant="secondary-filled"><RefreshCw aria-hidden /> تلاش مجدد</Button>}
            imageSrc="/images/illustration-failed.png"
            subtitle="لطفاً دوباره تلاش کنید."
            title={`خطا در بارگذاری ${copy.title}`}
          />
        ) : null}
        {!loading && !error && status === "authenticated" && !products.length ? (
          <StateMessage
            actions={<Button asChild size="large" variant="primary-filled"><Link href="/products">مشاهده محصولات</Link></Button>}
            imageSrc="/images/illustration-empty.png"
            subtitle={copy.emptySubtitle}
            title={copy.emptyTitle}
          />
        ) : null}
        {products.length ? <ProductActionGrid action={action} onRemove={(product) => void removeProduct(product)} products={products} removingId={removingId} /> : null}
        {canLoadMore ? (
          <div className="flex justify-center px-16 pb-32">
            <Button loading={loading} onClick={() => void loadPage(page + 1, true)} variant="tertiary-outline">
              نمایش محصولات بیشتر
            </Button>
          </div>
        ) : null}
        {error && products.length ? (
          <div className="flex justify-center px-16 pb-32">
            <Button onClick={() => void loadPage(page || 1, Boolean(page))} variant="tertiary-outline"><RefreshCw aria-hidden /> تلاش مجدد</Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
