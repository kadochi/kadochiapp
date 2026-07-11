import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { BreadcrumbPreview } from "../components/breadcrumb-preview";
import { ChipPreview } from "../components/chip-preview";
import { CheckboxPreview } from "../components/checkbox-preview";
import { RadioPreview } from "../components/radio-preview";
import { DividerPreview } from "../components/divider-preview";
import { LabelPreview } from "../components/label-preview";
import { SegmentSelectorPreview } from "../components/segment-selector-preview";
import { TogglePreview } from "../components/toggle-preview";
import { InputStepperPreview } from "../components/input-stepper-preview";
import { ProgressStepperPreview } from "../components/progress-stepper-preview";
import { TextAreaPreview } from "../components/textarea-preview";
import { InputPreview } from "../components/input-preview";
import { AccordionPreview } from "../components/accordion-preview";
import { BottomSheetPreview } from "../components/bottom-sheet-preview";
import { TabsPreview } from "../components/tabs-preview";
import { SelectPreview } from "../components/select-preview";
import { DropdownMenuPreview } from "../components/dropdown-menu-preview";
import { AlertPreview } from "../components/alert-preview";
import { ToastPreview } from "../components/toast-preview";
import { Eye } from "lucide-react";

const buttonVariants = [
  { name: "اصلی", value: "primary-filled" as const },
  { name: "اصلی تونال", value: "primary-tonal" as const },
  { name: "ثانویه", value: "secondary-filled" as const },
  { name: "ثانویه تونال", value: "secondary-tonal" as const },
  { name: "خط‌دار", value: "tertiary-outline" as const },
  { name: "شبح", value: "link-ghost" as const },
];

const sizes = ["small", "medium", "large"] as const;
const sizeLabels: Record<(typeof sizes)[number], string> = {
  small: "کوچک",
  medium: "متوسط",
  large: "بزرگ",
};

const avatarSizes = ["sm", "md", "lg", "xl"] as const;

const avatarExamples = [
  {
    name: "تصویر",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar
        size={size}
        alt="Sahar Ahmadi"
        src="https://i.pravatar.cc/160?img=47"
      />
    ),
  },
  {
    name: "حروف اول",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Sahar Ahmadi" />
    ),
  },
  {
    name: "جایگزین دلخواه",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Kadochi" fallback="ک" />
    ),
  },
  {
    name: "جایگزین پیش‌فرض",
    render: (size: (typeof avatarSizes)[number]) => <Avatar size={size} />,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-soft px-5 py-10 font-sans text-text-primary sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 border-b border-border-low-emphasis pb-6">
          <p className="text-label-12 text-surface-neutral-low-emphasis">Kadochi</p>
          <h1 className="mt-2 text-heading-32 font-regular tracking-[-.04em]">
            کامپوننت‌ها
          </h1>
        </header>

        <section aria-labelledby="buttons-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="buttons-heading" className="text-heading-24 font-regular">
              دکمه
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۶ نوع · ۳ اندازه · ۳ وضعیت
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
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {sizeLabels[size]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buttonVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === buttonVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {sizes.map((size) => (
                      <td key={size} className="px-5 py-5">
                        <div className="flex flex-col items-start gap-2">
                          <Button variant={value} size={size}>
                            <Eye aria-hidden="true" />
                            پیش‌نمایش
                          </Button>
                          <Button variant={value} size={size} disabled>
                            <Eye aria-hidden="true" />
                            غیرفعال
                          </Button>
                          <Button variant={value} size={size} loading>
                            پیش‌نمایش
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ChipPreview />

        <LabelPreview />

        <DividerPreview />

        <AccordionPreview />

        <BottomSheetPreview />

        <TogglePreview />

        <InputStepperPreview />

        <ProgressStepperPreview />

        <TextAreaPreview />

        <InputPreview />

        <SegmentSelectorPreview />

        <TabsPreview />

        <SelectPreview />

        <DropdownMenuPreview />

        <AlertPreview />

        <ToastPreview />

        <section className="mt-16" aria-labelledby="avatar-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="avatar-heading" className="text-heading-24 font-regular">
              آواتار
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۴ اندازه · حالت‌های تصویر، حروف اول و جایگزین
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    پیکربندی
                  </th>
                  {avatarSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avatarExamples.map(({ name, render }, index) => (
                  <tr key={name} className={index === avatarExamples.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {avatarSizes.map((size) => (
                      <td key={size} className="px-5 py-5">
                        {render(size)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Avatar alt="One name" />
            <Avatar aria-label="آواتار تزئینی با برچسب" fallback="A" />
            <Avatar alt="بازگشت به جایگزین در صورت خطای تصویر" src="/missing-avatar.png" />
          </div>
        </section>

        <CheckboxPreview />

        <RadioPreview />

        <BreadcrumbPreview />
      </div>
    </main>
  );
}
