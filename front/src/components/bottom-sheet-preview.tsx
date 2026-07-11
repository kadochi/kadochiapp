"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "./ui/bottom-sheet";

const sizes = ["sm", "md", "lg"] as const;

function SheetBody() {
  return (
    <div className="px-20 pb-20">
      <p className="text-body-14 text-text-secondary">
        محتوای شیت به‌صورت مستقل اسکرول می‌شود و استفاده از صفحه‌کلید و فوکوس را
        به‌درستی مدیریت می‌کند.
      </p>
    </div>
  );
}

function SheetExample({
  size,
  showHandle = true,
}: {
  size: (typeof sizes)[number];
  showHandle?: boolean;
}) {
  return (
    <BottomSheet>
      <BottomSheetTrigger asChild>
        <Button size="small" variant="tertiary-outline">
          باز کردن {size.toUpperCase()}
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent showHandle={showHandle} size={size}>
        <BottomSheetHeader>
          <div className="flex items-start justify-between gap-16">
            <div>
              <BottomSheetTitle className="text-title-18 font-regular">
                عنوان شیت
              </BottomSheetTitle>
              <BottomSheetDescription className="mt-4 text-body-14 text-text-secondary">
                نمونهٔ باز و قابل بستن
              </BottomSheetDescription>
            </div>
            <BottomSheetClose asChild>
              <button
                aria-label="بستن شیت"
                className="rounded-s p-4 text-text-secondary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-secondary/40"
                type="button"
              >
                <X aria-hidden="true" className="size-20" />
              </button>
            </BottomSheetClose>
          </div>
        </BottomSheetHeader>
        <SheetBody />
      </BottomSheetContent>
    </BottomSheet>
  );
}

function ControlledSheetExample() {
  const [open, setOpen] = useState(false);

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <Button size="small" variant="primary-filled" onClick={() => setOpen(true)}>
        باز کردن (کنترل‌شده)
      </Button>
      <BottomSheetContent size="md">
        <BottomSheetHeader>
          <BottomSheetTitle className="text-title-18 font-regular">
            شیت کنترل‌شده
          </BottomSheetTitle>
          <BottomSheetDescription className="text-body-14 text-text-secondary">
            وضعیت باز و بسته‌بودن از کامپوننت والد کنترل می‌شود.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="flex gap-8 px-20 pb-20">
          <Button size="small" onClick={() => setOpen(false)}>
            تأیید و بستن
          </Button>
          <BottomSheetClose asChild>
            <Button size="small" variant="link-ghost">
              انصراف
            </Button>
          </BottomSheetClose>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function BottomSheetPreview() {
  return (
    <section className="mt-16" aria-labelledby="bottom-sheet-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="bottom-sheet-heading" className="text-heading-24 font-regular">
          باتم‌شیت
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۳ اندازه · پیکربندی دستگیره · حالت‌های کنترل‌شده و کنترل‌نشده
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[48rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th className="w-48 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis" scope="col">
                پیکربندی
              </th>
              {sizes.map((size) => (
                <th className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis" key={size} scope="col">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-low-emphasis">
              <th className="px-5 py-5 text-label-14 font-regular" scope="row">
                با دستگیره
              </th>
              {sizes.map((size) => (
                <td className="px-5 py-5" key={size}>
                  <SheetExample size={size} />
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-5 py-5 text-label-14 font-regular" scope="row">
                بدون دستگیره
              </th>
              {sizes.map((size) => (
                <td className="px-5 py-5" key={size}>
                  <SheetExample showHandle={false} size={size} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <p className="mb-12 text-label-12 text-surface-neutral-mid-emphasis">
          وضعیت کنترل‌شده و اکشن‌های بستن دلخواه
        </p>
        <ControlledSheetExample />
      </div>
    </section>
  );
}

export { BottomSheetPreview };
