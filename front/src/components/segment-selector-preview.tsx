"use client";

import { useState } from "react";
import { SegmentSelector } from "./ui/segment-selector";

const tones = [
  { name: "Primary", value: "primary" as const },
  { name: "Secondary", value: "secondary" as const },
];

const sizes = ["sm", "md", "lg"] as const;

const items = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings" },
];

function ControlledSegmentSelector() {
  const [value, setValue] = useState("overview");

  return (
    <div className="flex w-full max-w-[30rem] flex-col gap-12">
      <SegmentSelector
        aria-label="Controlled view selector"
        items={items}
        value={value}
        onValueChange={setValue}
      />
      <p className="text-label-12 text-surface-neutral-mid-emphasis">
        Selected: {value}
      </p>
    </div>
  );
}

function SegmentSelectorPreview() {
  return (
    <section className="mt-16" aria-labelledby="segment-selector-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="segment-selector-heading" className="text-heading-24 font-regular">
          Segment selector
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 tones · 3 sizes · selected, disabled, controlled, and form states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[56.25rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                Tone
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
                        aria-label={`${name} ${size} segment selector`}
                        defaultValue="overview"
                        items={items}
                        size={size}
                        tone={value}
                      />
                      <SegmentSelector
                        aria-label={`${name} ${size} segment selector with disabled options`}
                        defaultValue="activity"
                        items={[
                          { value: "overview", label: "Overview" },
                          { value: "activity", label: "Activity", disabled: true },
                          { value: "settings", label: "Settings", disabled: true },
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
          <span className="text-label-12 text-surface-neutral-mid-emphasis">Unselected</span>
          <SegmentSelector
            aria-label="Unselected selector"
            className="max-w-[16rem]"
            items={[
              { value: "list", label: "List" },
              { value: "grid", label: "Grid" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">Controlled</span>
          <ControlledSegmentSelector />
        </div>
        <form className="flex flex-col gap-12" onSubmit={(event) => event.preventDefault()}>
          <span className="text-label-12 text-surface-neutral-mid-emphasis">Form field</span>
          <SegmentSelector
            aria-label="Delivery preference"
            defaultValue="courier"
            items={[
              { value: "courier", label: "Courier" },
              { value: "pickup", label: "Pickup" },
            ]}
            name="delivery"
            required
          />
        </form>
        <div className="flex flex-col gap-12">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">RTL</span>
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
