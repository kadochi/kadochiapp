"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OPEN_PWA_INSTALL_PROMPT_EVENT } from "@/lib/pwa-install";

/** The legacy closing brand message, rebuilt with layout and semantic text tokens. */
export function AboutKadochi() {
  return (
    <section className="grid justify-items-center gap-16 px-24 pb-24 pt-32 text-center">
      <h2 className="m-0 bg-[linear-gradient(to_left,var(--color-on-secondary-container),var(--color-secondary-gradient))] bg-clip-text text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-transparent">
        کادوچی؛ خرید کادو
      </h2>
      <p className="m-0 max-w-[720px] text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis">
        کادوچی به شما کمک می‌کند ضمن صرفه‌جویی در هزینه حمل‌ونقل و زمان، به‌سادگی کادوی مناسب برای فرد موردنظرتان را پیدا کنید. ما کادو را در بسته‌بندی زیبا برای کسانی که دوست‌شان دارید ارسال می‌کنیم یا می‌توانید هدیه را خودتان تحویل گرفته و تقدیم کنید.
      </p>
      <div className="flex flex-wrap justify-center gap-12">
        <Button asChild size="large" variant="secondary-filled">
          <Link href="/products">
            خرید کادو
            <ChevronLeft aria-hidden="true" />
          </Link>
        </Button>
        <Button onClick={() => window.dispatchEvent(new Event(OPEN_PWA_INSTALL_PROMPT_EVENT))} size="large" variant="tertiary-outline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src="/icons/pwa-download.svg" />
          دانلود وب اپلیکیشن
        </Button>
      </div>
    </section>
  );
}
