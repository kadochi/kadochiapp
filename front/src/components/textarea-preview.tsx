"use client";

import { useState } from "react";
import { Info, MessageSquare } from "lucide-react";
import { TextArea } from "./ui/textarea";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  {
    name: "پیش‌فرض",
    props: {
      description: "متن توضیحی اختیاری.",
      label: "توضیحات",
      required: true,
    },
  },
  {
    name: "خطا",
    props: {
      defaultValue: "خیلی کوتاه",
      description: "حداقل ۲۰ نویسه وارد کنید.",
      label: "توضیحات",
      status: "error" as const,
    },
  },
  {
    name: "موفقیت",
    props: {
      defaultValue: "یک توضیح کامل.",
      description: "خوب به نظر می‌رسد.",
      label: "توضیحات",
      status: "success" as const,
    },
  },
  {
    name: "غیرفعال",
    props: {
      defaultValue: "امکان ویرایش وجود ندارد.",
      description: "این فیلد قابل تغییر نیست.",
      disabled: true,
      label: "توضیحات",
    },
  },
];

function ControlledCountExample() {
  const [value, setValue] = useState("توضیح کوتاهی برای محصول.");

  return (
    <TextArea
      description="مقدار کنترل‌شده همراه با شمارش نویسه."
      label="توضیح محصول"
      maxLength={120}
      showCount
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function TextAreaPreview() {
  return (
    <section className="mt-16" aria-labelledby="textarea-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="textarea-heading" className="text-heading-24 font-regular">
          ناحیه متنی
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۳ اندازه · حالت‌های پیش‌فرض، خطا، موفقیت، غیرفعال و فوکوس
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-250 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                وضعیت
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map(({ name, props }, index) => (
              <tr
                key={name}
                className={index === states.length - 1 ? "" : "border-b border-border-low-emphasis"}
              >
                <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="min-w-80 px-5 py-5 align-top">
                    <TextArea {...props} placeholder="توضیحی بنویسید..." size={size} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <ControlledCountExample />
        <TextArea
          defaultValue="جزئیات مهم را وارد کنید."
          description="آیکون ابتدایی و چیدمان چپ‌به‌راست."
          dir="ltr"
          label="یادداشت‌ها"
          leadingIcon={<MessageSquare />}
          placeholder="یادداشتی اضافه کنید..."
          showCount
        />
        <TextArea
          description="یک نام قابل‌دسترس می‌تواند جایگزین برچسب نمایانی شود."
          aria-label="یادداشت داخلی"
          leadingIcon={<Info />}
          placeholder="یادداشت داخلی..."
          size="sm"
        />
      </div>
    </section>
  );
}

export { TextAreaPreview };
