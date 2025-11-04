import type { Meta, StoryObj } from "@storybook/react";
import ProgressStepper, { type StepItem } from "./ProgressStepper";

const meta: Meta<typeof ProgressStepper> = {
  title: "Components/ProgressStepper",
  component: ProgressStepper,
  parameters: { layout: "centered" },
  argTypes: {
    gap: { control: { type: "range", min: 56, max: 160, step: 4 } },
    showIndex: { control: "boolean" },
    steps: { control: "object", table: { disable: true } },
  },
};
export default meta;

const buildSteps = (count: number, currentIndex: number): StepItem[] => {
  const items: StepItem[] = [];
  for (let i = 1; i <= count; i++) {
    let status: StepItem["status"] = "todo";
    if (i < currentIndex) status = "done";
    else if (i === currentIndex) status = "current";
    items.push({ label: "مرحله", status });
  }
  return items;
};

type PlaygroundArgs = {
  count: number;
  currentIndex: number;
  showIndex: boolean;
  gap: number;
  useResponsiveGap: boolean;
};

export const Playground: StoryObj<PlaygroundArgs> = {
  render: ({ useResponsiveGap, ...args }) => {
    const steps = buildSteps(args.count, args.currentIndex);
    return (
      <ProgressStepper
        steps={steps}
        showIndex={args.showIndex}
        gap={useResponsiveGap ? undefined : args.gap}
      />
    );
  },
  args: {
    count: 4,
    currentIndex: 2,
    showIndex: true,
    gap: 112,
    useResponsiveGap: false,
  },
  argTypes: {
    count: { control: { type: "range", min: 2, max: 8, step: 1 } },
    currentIndex: { control: { type: "range", min: 1, max: 8, step: 1 } },
    useResponsiveGap: {
      control: "boolean",
      name: "Responsive gap (unset gap)",
    },
  },
};

export const ExplicitStatuses: StoryObj<typeof ProgressStepper> = {
  args: {
    gap: 112,
    showIndex: true,
    steps: [
      { label: "پرداخت وجه", status: "todo" },
      { label: "تکمیل اطلاعات", status: "current" },
      { label: "ارسال و بسته‌بندی", status: "done" },
      { label: "مرحله", status: "disabled" },
    ],
  },
  render: (args) => <ProgressStepper {...args} />,
};

export const ManySteps: StoryObj<typeof ProgressStepper> = {
  args: {
    gap: 88,
    showIndex: true,
    steps: [
      { label: "ثبت ایمیل", status: "done" },
      { label: "کد تأیید", status: "done" },
      { label: "تکمیل اطلاعات", status: "current" },
      { label: "بازبینی", status: "todo" },
      { label: "پرداخت", status: "todo" },
      { label: "اتمام", status: "disabled" },
    ],
  },
  render: (args) => <ProgressStepper {...args} />,
};
