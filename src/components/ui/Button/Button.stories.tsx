import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    type: {
      control: "inline-radio",
      options: ["primary", "secondary", "tertiary", "link"],
    },
    style: {
      control: "inline-radio",
      options: ["filled", "tonal", "outline", "ghost"],
    },
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
  args: {
    children: "عنوان دکمه",
    type: "primary",
    style: "filled",
    size: "medium",
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { type: "secondary", style: "tonal" } };
export const Outline: Story = { args: { type: "tertiary", style: "outline" } };
export const Link: Story = { args: { type: "link", style: "ghost" } };
