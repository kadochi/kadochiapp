import type { Meta, StoryObj } from "@storybook/react";
import TextArea from "./TextArea";

/* Meta */
const meta: Meta<typeof TextArea> = {
  title: "Components/TextArea",
  component: TextArea,
  parameters: { layout: "centered" },
  argTypes: {
    messageType: { control: "radio", options: ["hint", "error", "success"] },
    dir: { control: "radio", options: ["rtl", "ltr", "auto"] },
    showLabel: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    showMessage: { control: "boolean" },
    showCounter: { control: "boolean" },
    rows: { control: { type: "number", min: 2, max: 12, step: 1 } },
    maxLength: { control: { type: "number", min: 0, step: 1 } },
  },
  args: {
    label: "عنوان",
    showLabel: true,
    required: false,
    disabled: false,
    placeholder: "بنویسید…",
    showMessage: true,
    messageType: "hint",
    message: "متن راهنما",
    rows: 4,
    showCounter: true,
    maxLength: 140,
    dir: "rtl",
  },
};
export default meta;

type Story = StoryObj<typeof TextArea>;

/* Inline demo icon */
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

/* Playground */
export const Playground: Story = {
  render: (args) => <TextArea {...args} />,
};

/* With icon inside field */
export const WithIcon: Story = {
  args: {
    icon: <InfoIcon />,
    message: "آیکون داخلی فعال است",
    messageType: "hint",
  },
};

/* Common states */
export const States: Story = {
  args: { showCounter: false },
  render: (args) => (
    <div style={{ display: "grid", gap: 16, width: 520 }}>
      <TextArea {...args} message="پیش‌فرض" />
      <TextArea {...args} defaultValue="متن وارد شده" message="پر شده" />
      <TextArea {...args} disabled message="غیرفعال" />
      <TextArea {...args} messageType="error" message="خطا" />
      <TextArea {...args} messageType="success" message="موفق" />
    </div>
  ),
};

/* RTL vs LTR */
export const RTLvsLTR: Story = {
  args: { message: "Just a hint", showCounter: true },
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        width: 800,
      }}
    >
      <div>
        <h4 style={{ margin: "0 0 8px" }}>RTL</h4>
        <TextArea {...args} dir="rtl" />
      </div>
      <div>
        <h4 style={{ margin: "0 0 8px" }}>LTR</h4>
        <TextArea {...args} dir="ltr" />
      </div>
    </div>
  ),
};
