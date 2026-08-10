"use client";

import Link from "next/link";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";

import { Price } from "@/components/layout/price";
import { Input } from "@/components/ui/input";
import { usePrice } from "../hooks/usePrice";
import { fetchProductsPage } from "../services/products";
import type { Product } from "../types";

type SearchStatus = "idle" | "loading" | "success" | "error";

function SearchResult({ onSelect, product }: Readonly<{ onSelect: () => void; product: Product }>) {
  const { current, previous, offPercent } = usePrice(product);
  const image = product.images[0];

  return (
    <Link
      className="flex min-h-96 items-center gap-12 rounded-l px-8 py-8 text-inherit no-underline transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      href={`/product/${product.slug}`}
      onClick={onSelect}
      prefetch={false}
    >
      <div className="relative grid size-80 shrink-0 place-items-center overflow-hidden rounded-m bg-surface">
        {image ? (
          <Image
            alt={image.alt || product.name}
            className="size-full object-cover"
            fill
            loading="lazy"
            sizes="80px"
            src={image.url}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-start text-label-16 font-bold leading-[var(--text-label-16--line-height)] text-surface-neutral-high-emphasis">
          {product.name}
        </p>
        <div className="mt-8 text-start">
          {product.inStock ? (
            <Price current={current} offPercent={offPercent} previous={previous} />
          ) : (
            <span className="text-label-14 text-surface-neutral-low-emphasis">ناموجود</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Opens a focused, full-screen product search without changing the catalog filters. */
export function ProductSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    const term = query.trim();
    if (!term) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const result = await fetchProductsPage(
          { page: 1, perPage: 20, search: term, order: "desc", orderby: "date" },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setItems(result.items);
          setStatus("success");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    // Give fast typists enough time to finish a term before starting the two
    // catalog partition reads behind this endpoint.
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setItems([]);
    setStatus("idle");
  };

  const updateQuery = (value: string) => {
    const next = value.slice(0, 100);
    setQuery(next);
    if (!next.trim()) {
      setItems([]);
      setStatus("idle");
    } else {
      setStatus("loading");
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setIsOpen(true);
        else close();
      }}
    >
      <div className="px-16 pb-4 pt-16">
        <button
          aria-haspopup="dialog"
          className="flex h-48 w-full cursor-text items-center gap-12 rounded-rounded border border-border-high-emphasis bg-surface-background px-16 text-start text-label-16 text-surface-neutral-mid-emphasis transition-[border-color,box-shadow] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Search aria-hidden="true" className="size-20 shrink-0" />
          <span>جستجو در محصولات</span>
        </button>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1200] bg-surface-scrim" />
        <Dialog.Content className="fixed inset-0 z-[1201] flex flex-col bg-surface-background text-surface-neutral-high-emphasis outline-none" dir="rtl">
          <header className="flex h-64 shrink-0 items-center justify-between border-b border-border-low-emphasis px-16">
            <Dialog.Title className="text-title-18 font-bold">جستجوی محصولات</Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="بستن جستجو"
                className="inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded border-0 bg-transparent text-surface-neutral-high-emphasis transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                type="button"
              >
                <X aria-hidden="true" className="size-24" />
              </button>
            </Dialog.Close>
          </header>

          <div className="mx-auto flex w-full max-w-[720px] min-h-0 flex-1 flex-col px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16">
            <Input
              aria-label="جستجو در محصولات"
              autoComplete="off"
              autoFocus
              className="[&>div]:h-48 [&>div]:rounded-rounded"
              enterKeyHint="search"
              inputMode="search"
              leadingIcon={<Search />}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="نام محصول مورد نظرتان را بنویسید"
              ref={inputRef}
              trailingAction={query ? (
                <button
                  aria-label="پاک کردن جستجو"
                  className="inline-flex size-32 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-black transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => {
                    updateQuery("");
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                  type="button"
                >
                  <X aria-hidden="true" className="size-20" strokeWidth={1.5} />
                </button>
              ) : null}
              type="text"
              value={query}
            />

            <Dialog.Description className="sr-only">
              نام محصول را وارد کنید تا نتایج هم‌زمان نمایش داده شوند.
            </Dialog.Description>

            <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto pt-16">
              {status === "idle" ? (
                <p className="py-32 text-center text-body-14 text-surface-neutral-mid-emphasis">
                  برای پیدا کردن هدیه‌ی مناسب، جستجو را شروع کنید.
                </p>
              ) : null}
              {status === "loading" ? (
                <div className="flex items-center justify-center gap-8 py-32 text-body-14 text-surface-neutral-mid-emphasis">
                  <LoaderCircle aria-hidden="true" className="size-20 animate-spin" />
                  در حال جستجو…
                </div>
              ) : null}
              {status === "error" ? (
                <p className="py-32 text-center text-body-14 text-error">جستجو انجام نشد. لطفاً دوباره تلاش کنید.</p>
              ) : null}
              {status === "success" && !items.length ? (
                <p className="py-32 text-center text-body-14 text-surface-neutral-mid-emphasis">محصولی برای «{query.trim()}» پیدا نشد.</p>
              ) : null}
              {status === "success" && items.length ? (
                <ul aria-label="نتایج جستجو" className="divide-y divide-border-low-emphasis">
                  {items.map((product) => (
                    <li key={product.id}>
                      <SearchResult onSelect={close} product={product} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
