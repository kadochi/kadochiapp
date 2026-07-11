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
  { name: "Primary", value: "primary-filled" as const },
  { name: "Primary tonal", value: "primary-tonal" as const },
  { name: "Secondary", value: "secondary-filled" as const },
  { name: "Secondary tonal", value: "secondary-tonal" as const },
  { name: "Outline", value: "tertiary-outline" as const },
  { name: "Ghost", value: "link-ghost" as const },
];

const sizes = ["small", "medium", "large"] as const;

const avatarSizes = ["sm", "md", "lg", "xl"] as const;

const avatarExamples = [
  {
    name: "Image",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar
        size={size}
        alt="Sahar Ahmadi"
        src="https://i.pravatar.cc/160?img=47"
      />
    ),
  },
  {
    name: "Initials",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Sahar Ahmadi" />
    ),
  },
  {
    name: "Custom fallback",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Kadochi" fallback="ک" />
    ),
  },
  {
    name: "Default fallback",
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
            Components
          </h1>
        </header>

        <section aria-labelledby="buttons-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="buttons-heading" className="text-heading-24 font-regular">
              Button
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              6 variants · 3 sizes · 3 states
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
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {size}
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
                            Preview
                          </Button>
                          <Button variant={value} size={size} disabled>
                            <Eye aria-hidden="true" />
                            Disabled
                          </Button>
                          <Button variant={value} size={size} loading>
                            Preview
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
              Avatar
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              4 sizes · image, initials, and fallback states
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    Configuration
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
            <Avatar aria-label="A labeled decorative avatar" fallback="A" />
            <Avatar alt="Broken image falls back" src="/missing-avatar.png" />
          </div>
        </section>

        <CheckboxPreview />

        <RadioPreview />

        <BreadcrumbPreview />
      </div>
    </main>
  );
}
