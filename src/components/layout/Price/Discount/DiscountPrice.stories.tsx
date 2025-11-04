import type { Meta, StoryObj } from "@storybook/react";
import DiscountPrice from "./DiscountPrice";

const meta: Meta<typeof DiscountPrice> = {
  title: "Layout/Price/Discount",
  component: DiscountPrice,
  parameters: { layout: "centered" },
  args: {
    current: 4200000,
    previous: 5600000,
    offPercent: 25,
    size: "L",
    orientation: "horizontal",
  },
};
export default meta;

type Story = StoryObj<typeof DiscountPrice>;

export const HorizontalLarge: Story = {};
export const HorizontalMedium: Story = { args: { size: "M" } };
export const VerticalLarge: Story = { args: { orientation: "vertical" } };
export const VerticalMedium: Story = {
  args: { size: "M", orientation: "vertical" },
};
