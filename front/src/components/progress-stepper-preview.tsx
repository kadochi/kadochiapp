import { ProgressStepper } from "./ui/progress-stepper";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  {
    name: "در حال انجام",
    steps: [
      { label: "سبد خرید", status: "complete" as const },
      { label: "اطلاعات ارسال", status: "current" as const },
      { label: "پرداخت", status: "upcoming" as const },
      { label: "تأیید سفارش", status: "upcoming" as const },
    ],
  },
  {
    name: "تکمیل‌شده",
    steps: [
      { label: "سبد خرید", status: "complete" as const },
      { label: "اطلاعات ارسال", status: "complete" as const },
      { label: "پرداخت", status: "complete" as const },
      { label: "تأیید سفارش", status: "complete" as const },
    ],
  },
  {
    name: "مراحل غیرفعال",
    steps: [
      { label: "سبد خرید", status: "complete" as const },
      { label: "اطلاعات ارسال", status: "current" as const },
      { label: "پرداخت", status: "disabled" as const },
      { label: "تأیید سفارش", status: "disabled" as const },
    ],
  },
];

function ProgressStepperPreview() {
  return (
    <section className="mt-16" aria-labelledby="progress-stepper-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="progress-stepper-heading" className="text-heading-24 font-regular">
          نوار مراحل
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۳ اندازه · افقی و عمودی · حالت‌های تکمیل‌شده، جاری، آینده و غیرفعال
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[56.25rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th
                scope="col"
                className="w-44 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis"
              >
                وضعیت
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  scope="col"
                  className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis"
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map(({ name, steps }, index) => (
              <tr
                key={name}
                className={index === states.length - 1 ? "" : "border-b border-border-low-emphasis"}
              >
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="min-w-96 px-5 py-5 align-top">
                    <ProgressStepper size={size} steps={steps} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
            عمودی همراه با محتوای توضیحی
          </p>
          <ProgressStepper
            orientation="vertical"
            steps={[
              { label: "ثبت‌نام", description: "حساب شما ساخته شد", status: "complete" },
              { label: "تأیید شماره", description: "کد را وارد کنید", status: "current" },
              { label: "تکمیل پروفایل", status: "upcoming" },
            ]}
          />
        </div>

        <div className="min-w-0">
          <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
            بدون نمایش شماره · چیدمان چپ‌به‌راست
          </p>
          <ProgressStepper
            dir="ltr"
            showStepNumber={false}
            steps={[
              { label: "Account", status: "complete" },
              { label: "Verification", status: "current" },
              { label: "Finish", status: "upcoming" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export { ProgressStepperPreview };
