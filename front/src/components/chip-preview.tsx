"use client";

import { useState } from "react";
import { Check, ExternalLink, Tag } from "lucide-react";
import { Chip } from "./ui/chip";

const variants = [
  { name: "Outline", value: "outline" as const },
  { name: "Selected", value: "selected" as const },
];

const sizes = ["sm", "md"] as const;

function RemovableChip({ size }: { size: (typeof sizes)[number] }) {
  const [visible, setVisible] = useState(true);

  return visible ? (
    <Chip
      leadingIcon={<Tag />}
      removeLabel="Remove tag"
      size={size}
      onRemove={() => setVisible(false)}
    >
      قابل حذف
    </Chip>
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

function ChipPreview() {
  return (
    <section className="mt-16" aria-labelledby="chip-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="chip-heading" className="text-heading-24 font-regular">
          Chip
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 variants · 2 sizes · disabled, metadata, removable, and link states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
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
                  <td key={size} className="px-5 py-5 align-top">
                    <div className="flex flex-col items-start gap-12">
                      <Chip leadingIcon={value === "selected" ? <Check /> : <Tag />} size={size} variant={value}>
                        {value === "selected" ? "انتخاب شده" : "دسته‌بندی"}
                      </Chip>
                      <Chip badge="12" size={size} variant={value}>
                        همراه با نشان
                      </Chip>
                      <Chip disabled leadingIcon={<Tag />} size={size} variant={value}>
                        غیرفعال
                      </Chip>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-12 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <Chip trailingIcon={<ExternalLink />}>آیکون انتهایی</Chip>
        <RemovableChip size="md" />
        <Chip asChild leadingIcon={<ExternalLink />} variant="selected">
          <a href="#chip-heading">نمونهٔ پیوند</a>
        </Chip>
        <Chip asChild leadingIcon={<Check />}>
          <button aria-pressed="false" type="button">کنترل فیلتر</button>
        </Chip>
      </div>
    </section>
  );
}

export { ChipPreview };
