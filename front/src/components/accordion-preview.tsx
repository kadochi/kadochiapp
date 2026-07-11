"use client";

import { useState } from "react";
import { Accordion } from "./ui/accordion";

const variants = [
  { name: "Outline", value: "outline" as const },
  { name: "Subtle", value: "subtle" as const },
];

const sizes = ["sm", "md", "lg"] as const;

const items = [
  {
    value: "shipping",
    title: "هزینه و زمان ارسال چگونه است؟",
    content: "سفارش‌ها در تهران همان روز و در سایر شهرها طی ۲ تا ۴ روز کاری ارسال می‌شوند.",
  },
  {
    value: "returns",
    title: "شرایط بازگشت کالا چیست؟",
    content: "تا ۷ روز پس از تحویل، کالاهای واجد شرایط را می‌توانید بازگردانید.",
    disabled: true,
  },
  {
    value: "payment",
    title: "چه روش‌های پرداختی در دسترس است؟",
    content: "پرداخت آنلاین با کارت‌های شتاب و پرداخت در محل، بسته به شهر مقصد، پشتیبانی می‌شود.",
  },
] as const;

function ControlledAccordion() {
  const [value, setValue] = useState<string[]>(["shipping"]);

  return (
    <div className="flex flex-col gap-12">
      <Accordion items={items} value={value} onValueChange={setValue} />
      <p className="text-label-12 text-surface-neutral-mid-emphasis">
        Expanded: {value.length ? value.join(", ") : "none"}
      </p>
    </div>
  );
}

function AccordionPreview() {
  return (
    <section className="mt-16" aria-labelledby="accordion-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="accordion-heading" className="text-heading-24 font-regular">
          Accordion
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 variants · 3 sizes · open, closed, disabled, controlled, and multiple states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[68rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                Variant
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map(({ name, value }, index) => (
              <tr key={value} className={index === variants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="min-w-[18rem] px-5 py-5 align-top">
                    <Accordion
                      defaultValue={["payment"]}
                      items={items}
                      size={size}
                      variant={value}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4 lg:grid-cols-3">
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            All closed
          </span>
          <Accordion items={items} />
        </div>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            Multiple expanded
          </span>
          <Accordion
            defaultValue={["shipping", "payment"]}
            items={items}
            type="multiple"
          />
        </div>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            Controlled
          </span>
          <ControlledAccordion />
        </div>
      </div>

      <div className="mt-4 max-w-sm rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <span className="text-label-12 text-surface-neutral-mid-emphasis">LTR</span>
        <Accordion
          className="mt-12"
          dir="ltr"
          items={[
            {
              value: "support",
              title: "How can I contact support?",
              content: "Our support team is available by chat every day from 9:00 to 21:00.",
            },
          ]}
        />
      </div>
    </section>
  );
}

export { AccordionPreview };
