import type { Meta, StoryObj } from "@storybook/react";
import SumPrice from "./SumPrice";

const meta: Meta<typeof SumPrice> = {
  title: "Layout/Price/Sum",
  component: SumPrice,
  parameters: { layout: "centered" },
  args: { amount: 9600000 },
};
export default meta;

type Story = StoryObj<typeof SumPrice>;

export const Horizontal: Story = {};
export const Vertical: Story = { args: { orientation: "vertical" } };
