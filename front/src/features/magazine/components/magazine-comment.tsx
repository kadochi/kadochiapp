"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { ServiceError } from "@/lib/http/errors";
import { createMagazineComment } from "../services/comments";

function submissionErrorMessage(error: unknown) {
  if (error instanceof ServiceError) {
    if (error.detail.code === "rate_limited") return "تعداد ارسال نظر بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
    if (error.detail.code === "validation") return "متن نظر را بررسی کنید.";
    if (error.detail.code === "forbidden") return "ثبت نظر برای این مقاله غیرفعال است.";
    if (error.detail.code === "not_found") return "مقاله برای ثبت نظر پیدا نشد.";
    if (error.detail.retryable) return "ارسال نظر با مشکل ارتباطی مواجه شد. دوباره تلاش کنید.";
  }
  return "ارسال نظر ناموفق بود. دوباره تلاش کنید.";
}

/** Auth-gated magazine comment form. Comments remain pending until moderated. */
export function MagazineComment({ postId, nextPath }: Readonly<{ postId: number; nextPath: string }>) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const canSubmit = auth.status === "authenticated" && content.trim().length >= 3 && !isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      setError(null);
      setIsPending(true);
      await createMagazineComment(postId, content);
      setContent("");
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

  return (
    <section className="pb-16" aria-label="نظرات کاربران">
      <SectionHeader as="h2" title="نظرات کاربران" subtitle="نظر خود را درباره این مقاله بنویسید" />
      {auth.status === "loading" ? <div aria-label="در حال بررسی ورود" className="mx-16 h-[176px] animate-pulse rounded-xxl bg-surface-soft" role="status" />
        : auth.status !== "authenticated" ? <div className="mx-16 rounded-xxl bg-surface-soft px-16 py-48 text-center [direction:rtl]"><p className="m-0 font-sans text-label-14 text-surface-neutral-high-emphasis">برای درج نظر وارد حساب کاربری خود شوید.</p><Button asChild className="mt-16" size="medium" variant="tertiary-outline"><Link href={loginHref}>ورود به حساب کاربری</Link></Button></div>
          : <form className="mx-16 flex flex-col gap-8 [direction:rtl]" noValidate onSubmit={handleSubmit}>
            <TextArea aria-label="نظر شما" className="h-[218px] min-h-[218px]" description={error ?? undefined} label="نظر شما" maxLength={1000} onChange={(event) => { setContent(event.currentTarget.value); setError(null); }} placeholder="نظر خود را وارد کنید." required rows={4} showCount size="md" status={error ? "error" : "default"} value={content} />
            <div className="mt-8 flex justify-end"><Button className="px-16" disabled={!canSubmit} loading={isPending} size="medium" type="submit" variant="tertiary-outline">ثبت نظر</Button></div>
          </form>}
    </section>
  );
}
