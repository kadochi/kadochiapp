import type { Meta, StoryObj } from "@storybook/react";
import Divider from "./Divider";

const meta: Meta<typeof Divider> = {
  title: "Components/Divider",
  component: Divider,
  parameters: { layout: "centered" },
  argTypes: {
    type: { control: "select", options: ["divider", "spacer"] },
    variant: { control: "select", options: ["full-width", "with-padding"] },
  },
};
export default meta;

type Story = StoryObj<typeof Divider>;

export const Playground: Story = {
  args: { type: "divider", variant: "full-width" },
};
