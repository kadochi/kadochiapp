"use client";

import { useState } from "react";
import { AtSign, Eye, LockKeyhole, Search } from "lucide-react";
import { Input } from "./ui/input";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  {
    name: "پیش‌فرض",
    props: {
      description: "متن راهنمای مفید.",
      label: "نام و نام‌خانوادگی",
      required: true,
    },
  },
  {
    name: "خطا",
    props: {
      defaultValue: "invalid-email",
      description: "یک آدرس ایمیل معتبر وارد کنید.",
      label: "آدرس ایمیل",
      status: "error" as const,
      type: "email",
    },
  },
  {
    name: "موفقیت",
    props: {
      defaultValue: "sahar@example.com",
      description: "این آدرس ایمیل در دسترس است.",
      label: "آدرس ایمیل",
      status: "success" as const,
      type: "email",
    },
  },
  {
    name: "غیرفعال",
    props: {
      defaultValue: "امکان ویرایش وجود ندارد.",
      description: "این فیلد قابل تغییر نیست.",
      disabled: true,
      label: "نام حساب",
    },
  },
];

function ControlledInputExample() {
  const [value, setValue] = useState("");

  return (
    <Input
      description={value ? `در حال جست‌وجوی «${value}».` : "برای جست‌وجو تایپ کنید."}
      label="جست‌وجوی محصولات"
      leadingIcon={<Search />}
      placeholder="جست‌وجو..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function InputPreview() {
  return (
    <section className="mt-16" aria-labelledby="input-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="input-heading" className="text-heading-24 font-regular">
          ورودی متن
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
                    <Input {...props} placeholder="مقداری وارد کنید..." size={size} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <ControlledInputExample />
        <Input
          defaultValue="sahar@example.com"
          description="آیکون ابتدایی و انتهایی همراه با محتوای چپ‌به‌راست."
          dir="ltr"
          label="آدرس ایمیل"
          leadingIcon={<AtSign />}
          trailingIcon={<Eye />}
          type="email"
        />
        <Input
          description="propهای بومی ورودی، مانند تکمیل خودکار و حالت ورودی، به‌طور کامل پاس داده می‌شوند."
          inputMode="numeric"
          label="کد تأیید"
          placeholder="123456"
          autoComplete="one-time-code"
        />
        <Input
          aria-label="رمز عبور بدون برچسب نمایانی"
          leadingIcon={<LockKeyhole />}
          placeholder="رمز عبور"
          type="password"
          size="sm"
        />
      </div>
    </section>
  );
}

export { InputPreview };
