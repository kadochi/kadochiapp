// src/components/ui/SegmentSelector/SegmentSelector.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import SegmentSelector, { type SegmentItem } from "./SegmentSelector";

const meta: Meta<typeof SegmentSelector> = {
  title: "Components/SegmentSelector",
  component: SegmentSelector,
  parameters: { layout: "centered" },
  argTypes: {
    value: { control: false },
    onChange: { table: { disable: true } },
    items: { control: "object" },
  },
};
export default meta;

type Story = StoryObj<typeof SegmentSelector>;

const base3: SegmentItem[] = [
  { id: "latest", label: "جدیدترین" },
  { id: "oldest", label: "قدیمی‌ترین" },
  { id: "popular", label: "محبوب‌ترین" },
];

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value ?? "latest");
    return (
      <SegmentSelector
        {...args}
        items={args.items ?? base3}
        value={value}
        onChange={setValue}
      />
    );
  },
  args: { items: base3, value: "latest" },
};

export const LastActive: Story = {
  render: (args) => {
    const [value, setValue] = useState("popular");
    return (
      <SegmentSelector
        {...args}
        items={args.items ?? base3}
        value={value}
        onChange={setValue}
      />
    );
  },
  args: { items: base3 },
};
