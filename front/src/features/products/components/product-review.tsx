"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";

import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { ServiceError } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import { createProductReview } from "../services/products";

export type ProductReviewProps = {
  productId: number;
  averageRating: number;
  reviewCount: number;
  nextPath: string;
};

function submissionErrorMessage(error: unknown) {
  if (error instanceof ServiceError) {
    if (error.detail.code === "rate_limited") return "تعداد ارسال نظر بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
    if (error.detail.code === "validation") return "امتیاز و متن نظر را بررسی کنید.";
    if (error.detail.retryable) return "ارسال نظر با مشکل ارتباطی مواجه شد. دوباره تلاش کنید.";
  }
  return "ارسال نظر ناموفق بود. دوباره تلاش کنید.";
}

/** Auth-gated review form. Submitted reviews remain pending until moderated in WooCommerce. */
export function ProductReview({ productId, averageRating, reviewCount, nextPath }: Readonly<ProductReviewProps>) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const canSubmit = auth.status === "authenticated" && rating > 0 && content.trim().length >= 3 && !isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setError(null);
      setIsPending(true);
      await createProductReview(productId, { rating, content });
      setContent("");
      setRating(0);
      toast({ tone: "success", title: "نظر شما ثبت شد", description: "پس از تأیید نمایش داده می‌شود." });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ServiceError && caught.detail.code === "unauthenticated") {
        router.push(loginHref);
        return;
      }
      setError(submissionErrorMessage(caught));
    } finally {
      setIsPending(false);
    }
  }

  const ratingLabel = averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 });

  return (
    <section aria-label="نقد و بررسی کاربران">
      <SectionHeader
        as="h3"
        title="نقد و بررسی"
        subtitle="نظرات و امتیازات کاربران"
        leftSlot={
          <div className="inline-flex items-center gap-8 [direction:rtl]" aria-label="میانگین امتیاز">
            <Star aria-hidden className="size-18 fill-current text-surface-neutral-high-emphasis" />
            <div className="flex flex-col leading-none">
              <span className="font-sans text-label-14 font-bold leading-[var(--text-label-14--line-height)] text-surface-neutral-high-emphasis">
                {ratingLabel} امتیاز
              </span>
              <span className="font-sans text-label-12 font-regular leading-[var(--text-label-12--line-height)] text-surface-neutral-mid-emphasis">
                (از {reviewCount.toLocaleString("fa-IR")} کاربر)
              </span>
            </div>
          </div>
        }
      />

      {auth.status === "loading" ? (
        <div className="mx-16 h-112 animate-pulse rounded-xxl bg-surface" aria-label="در حال بررسی ورود" />
      ) : auth.status !== "authenticated" ? (
        <div className="mx-16 rounded-xxl bg-surface px-16 py-48 text-center [direction:rtl]">
          <p className="m-0 font-sans text-label-14 text-surface-neutral-high-emphasis">برای درج نظر وارد حساب کاربری خود شوید.</p>
          <Button asChild className="mt-16" size="medium" variant="tertiary-outline">
            <Link href={loginHref}>ورود به حساب کاربری</Link>
          </Button>
        </div>
      ) : (
        <form className="mx-16 flex flex-col gap-12 [direction:rtl]" noValidate onSubmit={handleSubmit}>
            <TextArea
              aria-label="نظر شما"
              description={error ?? undefined}
              maxLength={300}
              onChange={(event) => {
                setContent(event.currentTarget.value);
                setError(null);
              }}
              placeholder="نظر خود را وارد کنید."
              required
              rows={4}
              showCount
              size="md"
              status={error ? "error" : "default"}
              className="h-[218px] min-h-[218px]"
              value={content}
            />
            <div className="flex flex-wrap items-center justify-between gap-12">
              <div className="flex items-center gap-8" role="radiogroup" aria-label="امتیاز شما">
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = rating >= value;
                  return (
                    <button
                      aria-checked={rating === value}
                      aria-label={`${value} ستاره`}
                      className={cn(
                        "inline-flex size-32 cursor-pointer items-center justify-center bg-transparent p-8 text-surface-neutral-high-emphasis",
                        selected && "text-warning",
                      )}
                      key={value}
                      onClick={() => setRating(value)}
                      role="radio"
                      type="button"
                    >
                      <Star aria-hidden className="size-20" fill={selected ? "currentColor" : "none"} />
                    </button>
                  );
                })}
              </div>
              <Button className="px-16" disabled={!canSubmit} loading={isPending} size="medium" type="submit" variant="tertiary-outline">
                ثبت نظر
              </Button>
            </div>
        </form>
      )}
    </section>
  );
}
