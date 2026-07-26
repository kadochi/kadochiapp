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

const ratingOptions = [
  { value: 1, label: "خیلی ضعیف" },
  { value: 2, label: "ضعیف" },
  { value: 3, label: "متوسط" },
  { value: 4, label: "خوب" },
  { value: 5, label: "عالی" },
] as const;

function submissionErrorMessage(error: unknown) {
  if (error instanceof ServiceError) {
    if (error.detail.code === "rate_limited")
      return "تعداد ارسال نظر بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
    if (error.detail.code === "validation")
      return "امتیاز و متن نظر را بررسی کنید.";
    if (error.detail.code === "forbidden")
      return "ثبت نظر برای این محصول غیرفعال است.";
    if (error.detail.code === "not_found")
      return "محصول برای ثبت نظر پیدا نشد.";
    if (error.detail.retryable)
      return "ارسال نظر با مشکل ارتباطی مواجه شد. دوباره تلاش کنید.";
  }
  return "ارسال نظر ناموفق بود. دوباره تلاش کنید.";
}

/** Auth-gated review form. Submitted reviews remain pending until moderated in WooCommerce. */
export function ProductReview({
  productId,
  averageRating,
  reviewCount,
  nextPath,
}: Readonly<ProductReviewProps>) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const canSubmit =
    auth.status === "authenticated" &&
    rating > 0 &&
    content.trim().length >= 3 &&
    !isPending;
  const selectedRating = ratingOptions.find(
    (option) => option.value === rating,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setError(null);
      setIsPending(true);
      await createProductReview(productId, { rating, content });
      setContent("");
      setRating(0);
      toast({
        tone: "success",
        title: "نظر شما ثبت شد",
        description: "پس از تأیید نمایش داده می‌شود.",
      });
      router.refresh();
    } catch (caught) {
      if (
        caught instanceof ServiceError &&
        caught.detail.code === "unauthenticated"
      ) {
        router.push(loginHref);
        return;
      }
      setError(submissionErrorMessage(caught));
    } finally {
      setIsPending(false);
    }
  }

  const ratingLabel = averageRating.toLocaleString("fa-IR", {
    maximumFractionDigits: 1,
  });

  return (
    <section className="pb-16" aria-label="نقد و بررسی کاربران">
      <SectionHeader
        as="h2"
        title="نقد و بررسی"
        subtitle="نظرات و امتیازات کاربران"
        leftSlot={
          <div
            className="inline-flex items-center gap-8 [direction:rtl]"
            aria-label="میانگین امتیاز"
          >
            <Star
              aria-hidden
              className="size-18 fill-current text-surface-neutral-high-emphasis"
            />
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
        <div
          className="mx-16 h-[176px] animate-pulse rounded-xxl bg-surface-soft"
          aria-label="در حال بررسی ورود"
          role="status"
        />
      ) : auth.status !== "authenticated" ? (
        <div className="mx-16 rounded-xxl bg-surface-soft px-16 py-48 text-center [direction:rtl]">
          <p className="m-0 font-sans text-label-14 text-surface-neutral-high-emphasis">
            برای درج نظر وارد حساب کاربری خود شوید.
          </p>
          <Button
            asChild
            className="mt-16"
            size="medium"
            variant="tertiary-outline"
          >
            <Link href={loginHref}>ورود به حساب کاربری</Link>
          </Button>
        </div>
      ) : (
        <form
          className="mx-16 flex flex-col gap-8 [direction:rtl]"
          noValidate
          onSubmit={handleSubmit}
        >
          <fieldset className="m-0 mb-8 flex flex-col items-center gap-12 border-0 px-0 pb-0 pt-8">
            <legend className="w-full p-0 text-center font-sans text-label-12 font-regular text-surface-neutral-mid-emphasis">
              <span aria-live="polite">
                {selectedRating
                  ? `${selectedRating.label} (${rating.toLocaleString("fa-IR")} از ۵)`
                  : "یک امتیاز انتخاب کنید"}
              </span>
            </legend>
            <div className="flex items-center gap-4 [direction:rtl]">
              {ratingOptions.map((option) => {
                const filled = rating >= option.value;
                return (
                  <label
                    className="group relative inline-flex size-40 cursor-pointer items-center justify-center rounded-rounded text-surface-neutral-low-emphasis transition-colors hover:bg-warning-container hover:text-warning has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 has-[:focus-visible]:ring-offset-2"
                    key={option.value}
                  >
                    <input
                      aria-label={`${option.value.toLocaleString("fa-IR")} ستاره، ${option.label}`}
                      checked={rating === option.value}
                      className="peer sr-only"
                      name={`product-${productId}-rating`}
                      onChange={() => {
                        setRating(option.value);
                        setError(null);
                      }}
                      type="radio"
                      value={option.value}
                    />
                    <Star
                      aria-hidden
                      className={cn(
                        "size-24 transition-[fill,color,transform] duration-150 group-hover:scale-110 group-hover:fill-current",
                        filled
                          ? "fill-current text-warning"
                          : "fill-transparent",
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <TextArea
            aria-label="نظر شما"
            className="h-[218px] min-h-[218px]"
            description={error ?? undefined}
            label="نظر شما"
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
            value={content}
          />
          <div className="mt-8 flex justify-end">
            <Button
              className="px-16"
              disabled={!canSubmit}
              loading={isPending}
              size="medium"
              type="submit"
              variant="tertiary-outline"
            >
              ثبت نظر
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
