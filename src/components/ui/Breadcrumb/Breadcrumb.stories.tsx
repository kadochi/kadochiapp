import type { Meta, StoryObj } from "@storybook/react";
import Breadcrumb from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "Components/Breadcrumb",
  component: Breadcrumb,
  parameters: { layout: "centered" },
  argTypes: { items: { control: "object" } },
};
export default meta;

type Story = StoryObj<typeof Breadcrumb>;

export const Playground: Story = {
  args: {
    items: [
      { label: "خانه", href: "#" },
      { label: "محصولات", href: "#" },
      { label: "دسته‌بندی", href: "#" },
      { label: "صفحه فعلی" },
    ],
  },
};

export const Overflow: Story = {
  args: {
    items: [
      { label: "خانه", href: "#" },
      { label: "محصولات طولانی", href: "#" },
      { label: "دسته‌بندی خیلی بزرگ", href: "#" },
      { label: "صفحه فعلی با عنوان بلند" },
    ],
  },
};
