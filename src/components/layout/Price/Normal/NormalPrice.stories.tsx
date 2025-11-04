import type { Meta, StoryObj } from "@storybook/react";
import NormalPrice from "./NormalPrice";

const meta: Meta<typeof NormalPrice> = {
  title: "Layout/Price/Normal",
  component: NormalPrice,
  parameters: { layout: "centered" },
  args: { amount: 5600000, size: "L" },
};
export default meta;

type Story = StoryObj<typeof NormalPrice>;

export const Large: Story = {};
export const Medium: Story = { args: { size: "M" } };
