"use client";

import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Button from "@/components/ui/Button/Button";
import Header from "@/components/layout/Header/Header";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="page" dir="rtl">
      <Header />
      <div className="layoutContainer" style={{ padding: "var(--space-16)" }}>
        <StateMessage
          imageSrc="/images/illustration-failed.png"
          imageAlt="خطا"
          title="خطا در دریافت محصولات"
          subtitle="اتصال یا تنظیمات را بررسی کنید و دوباره تلاش کنید."
          actions={
            <Button
              as="a"
              type="tertiary"
              style="outline"
              size="medium"
              aria-label="تلاش مجدد"
            >
              تلاش مجدد
            </Button>
          }
        />

        <pre
          style={{
            marginTop: "var(--space-16)",
            whiteSpace: "pre-wrap",
            fontSize: 12,
            opacity: 0.7,
            direction: "ltr",
          }}
        >
          {error?.message}
        </pre>
      </div>
    </main>
  );
}
