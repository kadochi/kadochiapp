"use client";

import { useState } from "react";
import { Toggle } from "./ui/toggle";

const tones = [
  { name: "Primary", value: "primary" as const },
  { name: "Secondary", value: "secondary" as const },
];

const sizes = ["sm", "md"] as const;

function ControlledToggle() {
  const [checked, setChecked] = useState(false);

  return (
    <Toggle
      checked={checked}
      label={checked ? "Controlled: on" : "Controlled: off"}
      onCheckedChange={setChecked}
    />
  );
}

function TogglePreview() {
  return (
    <section className="mt-16" aria-labelledby="toggle-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="toggle-heading" className="text-heading-24 font-regular">
          Toggle
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 tones · 2 sizes · checked and disabled states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
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
                    <div className="flex flex-col items-start gap-16">
                      <Toggle tone={value} size={size} label="Off" />
                      <Toggle tone={value} size={size} defaultChecked label="On" />
                      <Toggle tone={value} size={size} disabled label="Disabled off" />
                      <Toggle tone={value} size={size} defaultChecked disabled label="Disabled on" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-32 gap-y-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <Toggle aria-label="Toggle without a visible label" />
        <Toggle defaultChecked name="notifications" label="Uncontrolled" />
        <ControlledToggle />
        <Toggle label={<><span className="font-bold">Rich</span> label content</>} />
      </div>
    </section>
  );
}

export { TogglePreview };
