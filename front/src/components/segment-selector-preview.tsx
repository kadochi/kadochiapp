"use client";

import { useState } from "react";
import { SegmentSelector } from "./ui/segment-selector";

const tones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];

const sizes = ["sm", "md", "lg"] as const;

const items = [
  { value: "overview", label: "نمای کلی" },
  { value: "activity", label: "فعالیت" },
  { value: "settings", label: "تنظیمات" },
];

function ControlledSegmentSelector() {
  const [value, setValue] = useState("overview");

  return (
    <div className="flex w-full max-w-[30rem] flex-col gap-12">
      <SegmentSelector
        aria-label="انتخابگر نمای کنترل‌شده"
        items={items}
        value={value}
        onValueChange={setValue}
      />
      <p className="text-label-12 text-surface-neutral-mid-emphasis">
        انتخاب‌شده: {value}
      </p>
    </div>
  );
}

function SegmentSelectorPreview() {
  return (
    <section className="mt-16" aria-labelledby="segment-selector-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="segment-selector-heading" className="text-heading-24 font-regular">
          سلکتور بخش‌بندی
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۲ رنگ‌مایه · ۳ اندازه · حالت‌های انتخاب‌شده، غیرفعال، کنترل‌شده و فرم
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[56.25rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                رنگ‌مایه
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tones.map(({ name, value }, index) => (
              <tr key={value} className={index === tones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="px-5 py-5 align-top">
                    <div className="flex min-w-[16rem] flex-col gap-16">
                      <SegmentSelector
                        aria-label={`سلکتور بخش‌بندی ${name} با اندازه ${size}`}
                        defaultValue="overview"
                        items={items}
                        size={size}
                        tone={value}
                      />
                      <SegmentSelector
                        aria-label={`سلکتور بخش‌بندی ${name} با اندازه ${size} و گزینه‌های غیرفعال`}
                        defaultValue="activity"
                        items={[
                          { value: "overview", label: "نمای کلی" },
                          { value: "activity", label: "فعالیت", disabled: true },
                          { value: "settings", label: "تنظیمات", disabled: true },
                        ]}
                        size={size}
                        tone={value}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4 sm:grid-cols-2">
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">انتخاب‌نشده</span>
          <SegmentSelector
            aria-label="سلکتور بدون انتخاب"
            className="max-w-[16rem]"
            items={[
              { value: "list", label: "فهرست" },
              { value: "grid", label: "شبکه" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">کنترل‌شده</span>
          <ControlledSegmentSelector />
        </div>
        <form className="flex flex-col gap-12" onSubmit={(event) => event.preventDefault()}>
          <span className="text-label-12 text-surface-neutral-mid-emphasis">فیلد فرم</span>
          <SegmentSelector
            aria-label="ترجیح ارسال"
            defaultValue="courier"
            items={[
              { value: "courier", label: "پیک" },
              { value: "pickup", label: "دریافت حضوری" },
            ]}
            name="delivery"
            required
          />
        </form>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">راست‌به‌چپ</span>
          <SegmentSelector
            aria-label="روش نمایش"
            defaultValue="list"
            items={[
              { value: "list", label: "فهرست" },
              { value: "grid", label: "شبکه" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export { SegmentSelectorPreview };
