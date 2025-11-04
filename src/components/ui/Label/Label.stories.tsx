import type { Meta, StoryObj } from "@storybook/react";
import Label from "./Label";
import { Info } from "lucide-react";

const meta: Meta<typeof Label> = {
  title: "Components/Label",
  component: Label,
  parameters: { layout: "centered" },
  argTypes: {
    type: {
      control: "select",
      options: ["primary", "secondary", "warning", "danger", "deactive"],
    },
    style: { control: "select", options: ["gradient", "solid", "tonal"] },
    size: { control: "select", options: ["small", "medium"] },
  },
  args: { children: "Label", type: "primary", style: "solid", size: "medium" },
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Playground: Story = {
  render: (args) => <Label {...args} />,
};

export const WithIcon: Story = {
  args: {
    type: "warning",
    style: "gradient",
    size: "medium",
    icon: <Info size={16} />,
    children: "With Icon",
  },
  render: (args) => <Label {...args} />,
};
