"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Select } from "./ui/select";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  { name: "Default", props: {} },
  {
    name: "Error",
    props: {
      status: "error" as const,
      description: "لطفاً یک شهر را انتخاب کنید.",
    },
  },
  {
    name: "Success",
    props: {
      status: "success" as const,
      description: "شهر انتخاب شد.",
      defaultValue: "tehran",
    },
  },
  { name: "Disabled", props: { disabled: true, defaultValue: "tehran" } },
];

const cities = [
  { value: "tehran", label: "تهران" },
  { value: "mashhad", label: "مشهد" },
  { value: "isfahan", label: "اصفهان" },
  { value: "shiraz", label: "شیراز" },
  { value: "tabriz", label: "تبریز", disabled: true },
];

function ControlledSelect() {
  const [value, setValue] = useState<string>();

  return (
    <Select
      label="شهر"
      description={value ? `انتخاب شده: ${value}` : "برای جست‌وجو تایپ کنید."}
      leadingIcon={<MapPin />}
      placeholder="یک شهر انتخاب کنید"
      items={cities}
      value={value}
      onValueChange={setValue}
    />
  );
}

function SelectPreview() {
  return (
    <section className="mt-16" aria-labelledby="select-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="select-heading" className="text-heading-24 font-regular">
          Select
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          3 sizes · default, error, success, disabled · RTL popper
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-250 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                State
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
              <tr key={name} className={index === states.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="min-w-80 px-5 py-5 align-top">
                    <Select
                      label="شهر"
                      placeholder="انتخاب کنید"
                      items={cities}
                      size={size}
                      {...props}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <ControlledSelect />
        <Select
          leadingIcon={<MapPin />}
          aria-label="شهر بدون برچسب"
          placeholder="بدون برچسب"
          items={cities}
        />
      </div>
    </section>
  );
}

export { SelectPreview };
