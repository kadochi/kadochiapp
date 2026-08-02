"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Divider } from "@/components/ui/divider";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { useProfileCompletion } from "../hooks/use-profile-completion";
import type { ProfileCompletion, ProfileCompletionTask } from "../utils/profile-completion";

const persianNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function CompletionTask({ task }: { task: ProfileCompletionTask }) {
  const content = <><span className="flex min-w-0 flex-1 items-center gap-12"><span className={cn("grid size-18 shrink-0 place-items-center rounded-full border", task.complete ? "border-success bg-success text-on-success" : "border-secondary bg-surface-background")}>{task.complete ? <Check aria-hidden className="size-12" strokeWidth={3} /> : null}</span><span className="text-label-14 text-surface-neutral-high-emphasis">{task.label}</span></span>{task.href && !task.complete ? <ChevronLeft aria-hidden className="size-20 shrink-0 text-surface-neutral-mid-emphasis" /> : null}</>;
  const className = cn("flex min-h-48 items-center justify-between rounded-m border bg-surface-background px-12 text-right no-underline transition-colors hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary", task.complete ? "border-border-high-emphasis" : "border-secondary");

  return task.href && !task.complete ? <Link className={className} href={task.href}>{content}</Link> : <div className={className}>{content}</div>;
}

function levelCopy(completion: ProfileCompletion) {
  if (completion.level === "newcomer") return {
    title: "تکمیل پروفایل",
    description: "با تکمیل قسمت‌های زیر، حساب کاربری خود را کامل کنید تا به سطح بعدی برسید.",
    label: "سطح تازه‌وارد",
    labelClassName: "text-secondary",
  };
  if (completion.level === "regular") return {
    title: "ماموریت‌های کاربر عادی",
    description: "با تکمیل ماموریت‌های زیر، به سطح کاربر حرفه‌ای برسید.",
    label: "کاربر عادی",
    labelClassName: "text-success",
  };
  return {
    title: "کاربر حرفه‌ای",
    description: "همه ماموریت‌ها را تکمیل کرده‌اید.",
    label: "کاربر حرفه‌ای",
    labelClassName: "text-secondary",
  };
}

export function ProfileCompletionPage() {
  const router = useRouter();
  const { customer, status } = useAuth();
  const { completion, loading: completionLoading } = useProfileCompletion(customer);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/profile/completion");
  }, [router, status]);

  useEffect(() => {
    if (completion?.level === "pro") router.replace("/profile");
  }, [completion?.level, router]);

  if (status === "loading" || !customer || completionLoading || !completion) {
    return <div className="min-h-dvh bg-surface-background" dir="rtl"><Header backUrl="/profile" title="تکمیل پروفایل" variant="internal" /><main className="mx-auto grid w-full max-w-[640px] gap-12 px-16 py-24"><div className="h-160 animate-pulse rounded-l bg-surface" /><div className="h-48 animate-pulse rounded-m bg-surface" /><div className="h-48 animate-pulse rounded-m bg-surface" /></main></div>;
  }

  if (completion.level === "pro") return null;

  const progressLabel = `${persianNumber.format(completion.percentage)}٪`;
  const copy = levelCopy(completion);

  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header backUrl="/profile" title="تکمیل پروفایل" variant="internal" />
      <main className="w-full py-20">
        <div className="mx-auto w-full max-w-[640px] px-16">
          <section aria-labelledby="profile-completion-title">
            <div className="rounded-m border border-secondary bg-surface-background p-12 min-[580px]:p-16">
              <div className="flex items-start justify-between gap-16">
                <div className="grid gap-4 text-right">
                  <h1 className="m-0 text-title-18 font-bold text-surface-neutral-high-emphasis" id="profile-completion-title">{copy.title}</h1>
                  <p className="m-0 text-body-12 text-surface-neutral-mid-emphasis">{copy.description}</p>
                </div>
                <span className={cn("shrink-0 text-label-14 font-bold", copy.labelClassName)}>{copy.label}</span>
              </div>
              <div className="mt-16 flex items-center justify-between gap-12 text-label-12 text-surface-neutral-mid-emphasis">
                <span>{progressLabel}</span>
                <span>{persianNumber.format(completion.completedCount)} از {persianNumber.format(completion.totalCount)} مورد</span>
              </div>
              <div aria-label={`تکمیل ${progressLabel} پروفایل`} aria-valuemax={completion.totalCount} aria-valuemin={0} aria-valuenow={completion.completedCount} className="mt-8 h-12 overflow-hidden rounded-rounded bg-secondary-container" role="progressbar">
                <div className="h-full rounded-rounded bg-secondary transition-[width] duration-300" style={{ width: `${completion.percentage}%` }} />
              </div>
            </div>
          </section>
        </div>

        <Divider className="mt-16" size="md" variant="spacer" />

        <section className="mx-auto mt-16 w-full max-w-[640px] px-16" aria-labelledby="profile-missions-title">
          <h2 className="m-0 mb-12 text-title-16 font-bold text-surface-neutral-high-emphasis" id="profile-missions-title">ماموریت‌ها</h2>
          <div className="grid gap-12">
            {completion.tasks.map((task) => <CompletionTask key={task.id} task={task} />)}
          </div>
        </section>
      </main>
    </div>
  );
}
