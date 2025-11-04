import type { Meta, StoryObj } from "@storybook/react";
import Tabs, { type TabItem } from "./Tabs";
import { useState } from "react";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
};
export default meta;

type Args = { items: TabItem[] };

export const Playground: StoryObj<Args> = {
  render: (args) => {
    const [value, setValue] = useState(args.items[0]?.id);
    return <Tabs {...args} value={value} onChange={setValue} />;
  },
  args: {
    items: [
      { id: "1", label: "سفارش‌های جاری" },
      { id: "2", label: "تب ۲" },
      { id: "3", label: "تب ۳" },
    ],
  },
};
