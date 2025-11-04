import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Input from "./Input";

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15" />
    <path fill="currentColor" d="M11 10h2v7h-2zm0-3h2v2h-2z" />
  </svg>
);

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  parameters: { layout: "centered" },
  argTypes: {
    messageType: {
      control: "inline-radio",
      options: ["hint", "error", "success"],
    },
    showLabel: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    withIcon: { control: "boolean", name: "withIcon" },
    dir: { control: "inline-radio", options: ["rtl", "ltr", "auto"] },
  } as any,
  args: {
    dir: "rtl",
    showLabel: true,
    label: "عنوان",
    required: false,
    disabled: false,
    placeholder: "متن ورودی",
    message: "متن راهنما",
    messageType: "hint",
    withIcon: false,
  } as any,
};
export default meta;

type Story = StoryObj<typeof Input & { withIcon?: boolean }>;

export const Playground: Story = {
  render: (args: any) => {
    const [v, setV] = React.useState("");
    const icon = args.withIcon ? <InfoIcon /> : undefined;
    return (
      <div style={{ width: 360, direction: args.dir }}>
        <Input
          {...args}
          icon={icon}
          value={v}
          onChange={(e) => setV(e.currentTarget.value)}
        />
      </div>
    );
  },
};

export const Filled: Story = {
  args: {
    message: "متن راهنما",
    withIcon: true,
    defaultValue: "مقدار وارد شده",
  } as any,
  render: (args: any) => (
    <div style={{ width: 360, direction: args.dir }}>
      <Input {...args} icon={<InfoIcon />} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, message: "غیرفعال" } as any,
  render: (args: any) => (
    <div style={{ width: 360, direction: args.dir }}>
      <Input {...args} />
    </div>
  ),
};

export const Error: Story = {
  args: { messageType: "error", message: "پیغام خطا", required: true } as any,
  render: (args: any) => {
    const [v, setV] = React.useState("");
    return (
      <div style={{ width: 360, direction: args.dir }}>
        <Input {...args} value={v} onChange={(e) => setV(e.target.value)} />
      </div>
    );
  },
};

export const Success: Story = {
  args: { messageType: "success", message: "پیغام موفقیت" } as any,
  render: (args: any) => {
    const [v, setV] = React.useState("درست");
    return (
      <div style={{ width: 360, direction: args.dir }}>
        <Input {...args} value={v} onChange={(e) => setV(e.target.value)} />
      </div>
    );
  },
};
