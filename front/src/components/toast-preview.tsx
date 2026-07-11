"use client";

import { Button } from "./ui/button";
import { useToast } from "./ui/toaster";
import type { AlertTone } from "./ui/alert";

const toasts: { tone: AlertTone; label: string; title: string; body: string }[] = [
  { tone: "info", label: "اطلاع", title: "اطلاع‌رسانی", body: "نسخهٔ جدید در دسترس است." },
  { tone: "success", label: "موفقیت", title: "انجام شد", body: "سفارش شما ثبت شد." },
  { tone: "warning", label: "هشدار", title: "هشدار", body: "موجودی رو به پایان است." },
  { tone: "error", label: "خطا", title: "خطا", body: "اتصال برقرار نشد." },
];

function ToastPreview() {
  const { toast } = useToast();

  return (
    <section className="mt-16" aria-labelledby="toast-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="toast-heading" className="text-heading-24 font-regular">
          توست
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۴ رنگ‌مایه · بسته‌شدن خودکار · بسته‌شدن با کشیدن
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-12 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        {toasts.map(({ tone, label, title, body }) => (
          <Button
            key={tone}
            variant="tertiary-outline"
            size="small"
            onClick={() => toast({ tone, title, description: body })}
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}

export { ToastPreview };
