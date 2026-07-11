"use client";

import { useState } from "react";
import { Alert, type AlertTone } from "./ui/alert";

const tones: { tone: AlertTone; title: string; body: string }[] = [
  { tone: "info", title: "اطلاع‌رسانی", body: "نسخهٔ جدید در دسترس است." },
  { tone: "success", title: "انجام شد", body: "تغییرات با موفقیت ذخیره شد." },
  { tone: "warning", title: "هشدار", body: "اعتبار حساب شما رو به پایان است." },
  { tone: "error", title: "خطا", body: "پرداخت ناموفق بود، دوباره تلاش کنید." },
];

function DismissibleAlert({
  tone,
  title,
  body,
}: {
  tone: AlertTone;
  title: string;
  body: string;
}) {
  const [visible, setVisible] = useState(true);

  return visible ? (
    <Alert tone={tone} title={title} onDismiss={() => setVisible(false)}>
      {body}
    </Alert>
  ) : (
    <button
      className="text-label-12 text-secondary underline underline-offset-4"
      type="button"
      onClick={() => setVisible(true)}
    >
      بازگرداندن
    </button>
  );
}

function AlertPreview() {
  return (
    <section className="mt-16" aria-labelledby="alert-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="alert-heading" className="text-heading-24 font-regular">
          پیام هشدار
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۴ رنگ‌مایه · عنوان + توضیح · قابل بستن
        </p>
      </div>

      <div className="grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        {tones.map(({ tone, title, body }) => (
          <Alert key={tone} tone={tone} title={title}>
            {body}
          </Alert>
        ))}
        {tones.map(({ tone, title, body }) => (
          <DismissibleAlert key={`${tone}-dismiss`} tone={tone} title={title} body={body} />
        ))}
      </div>
    </section>
  );
}

export { AlertPreview };
