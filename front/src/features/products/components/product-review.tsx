"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";

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
      <div className="flex items-center justify-between gap-16 px-16 pt-24 pb-16 [direction:rtl]">
        <div>
          <h3 className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">نقد و بررسی</h3>
          <p className="m-0 mt-4 font-sans text-label-14 text-surface-neutral-mid-emphasis">نظرات و امتیازات کاربران</p>
        </div>
        <div className="flex shrink-0 items-center gap-6 text-surface-neutral-mid-emphasis" aria-label="میانگین امتیاز">
          <Star aria-hidden className="size-18 fill-current text-warning" />
          <span className="font-sans text-label-14 font-bold text-surface-neutral-high-emphasis">{ratingLabel} امتیاز</span>
          <span className="font-sans text-label-12">({reviewCount.toLocaleString("fa-IR")} کاربر)</span>
        </div>
      </div>

      <div className="px-16">
        {auth.status === "loading" ? (
          <div className="h-112 animate-pulse rounded-l bg-surface" aria-label="در حال بررسی ورود" />
        ) : auth.status !== "authenticated" ? (
          <div className="rounded-l bg-surface p-16 text-center [direction:rtl]">
            <p className="m-0 font-sans text-body-14 text-surface-neutral-mid-emphasis">برای درج نظر وارد حساب کاربری خود شوید.</p>
            <Button asChild className="mt-12" size="medium" variant="tertiary-outline">
              <Link href={loginHref}>ورود به حساب کاربری</Link>
            </Button>
          </div>
        ) : (
          <form className="grid gap-16 [direction:rtl]" noValidate onSubmit={handleSubmit}>
            <TextArea
              description={error ?? undefined}
              label="نظر شما"
              maxLength={1000}
              onChange={(event) => {
                setContent(event.currentTarget.value);
                setError(null);
              }}
              placeholder="نظر خود را وارد کنید."
              required
              showCount
              status={error ? "error" : "default"}
              value={content}
            />
            <div className="flex flex-wrap items-center justify-between gap-12">
              <div className="flex items-center gap-4" role="radiogroup" aria-label="امتیاز شما">
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = rating >= value;
                  return (
                    <button
                      aria-checked={rating === value}
                      aria-label={`${value} ستاره`}
                      className={cn("inline-flex size-32 cursor-pointer items-center justify-center rounded-rounded border-0 bg-transparent p-0 text-border-high-emphasis", selected && "text-warning")}
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
              <Button disabled={!canSubmit} loading={isPending} size="medium" type="submit" variant="tertiary-outline">
                ثبت نظر
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
