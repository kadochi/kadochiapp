"use client";

import { useState } from "react";
import {
  InputStepper,
  type InputStepperProps,
} from "./ui/input-stepper";

const variants = [
  { name: "خط‌دار", value: "outline" as const },
  { name: "ملایم", value: "subtle" as const },
];

const sizes = ["sm", "md"] as const;

type StepperDemoProps = Pick<
  InputStepperProps,
  "disabled" | "max" | "min" | "size" | "step" | "variant"
> & {
  initialValue: number;
  removable?: boolean;
};

function StepperDemo({
  initialValue,
  min = 1,
  removable = false,
  ...props
}: StepperDemoProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <InputStepper
      {...props}
      min={min}
      value={value}
      aria-label="تعداد"
      onRemove={removable ? () => setValue(min) : undefined}
      onValueChange={setValue}
    />
  );
}

function InputStepperPreview() {
  return (
    <section className="mt-16" aria-labelledby="input-stepper-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="input-stepper-heading" className="text-heading-24 font-regular">
          شمارشگر عددی
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۲ نوع · ۲ اندازه · حالت‌های فعال، حداقل، حداکثر و غیرفعال
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                نوع
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map(({ name, value: variant }, index) => (
              <tr
                key={variant}
                className={
                  index === variants.length - 1
                    ? ""
                    : "border-b border-border-low-emphasis"
                }
              >
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="px-5 py-5 align-top">
                    <div className="flex flex-col items-start gap-16" dir="rtl">
                      <StepperDemo
                        initialValue={2}
                        max={5}
                        size={size}
                        variant={variant}
                      />
                      <StepperDemo
                        initialValue={1}
                        max={5}
                        removable
                        size={size}
                        variant={variant}
                      />
                      <StepperDemo
                        initialValue={5}
                        max={5}
                        size={size}
                        variant={variant}
                      />
                      <StepperDemo
                        disabled
                        initialValue={2}
                        max={5}
                        size={size}
                        variant={variant}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4" dir="rtl">
        <div className="flex flex-col gap-2">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            کنترل‌نشده · بازه و پله دلخواه
          </span>
          <InputStepper defaultValue={6} max={10} min={2} step={2} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            کنترل‌شده
          </span>
          <StepperDemo initialValue={3} max={8} />
        </div>
      </div>
    </section>
  );
}

export { InputStepperPreview };
