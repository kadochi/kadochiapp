import type { Meta, StoryObj } from "@storybook/react";
import Toggle from "./Toggle";

const meta: Meta<typeof Toggle> = {
  title: "Components/Toggle",
  component: Toggle,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Toggle>;

export const StatesRow: Story = {
  name: "States (off → hover off → on → hover on → disabled off → disabled on)",
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <Toggle />
      <div style={{ transform: "translateZ(0)" }}>
        <Toggle />
      </div>
      <Toggle defaultChecked />
      <div style={{ transform: "translateZ(0)" }}>
        <Toggle defaultChecked />
      </div>
      <Toggle disabled />
      <Toggle disabled defaultChecked />
    </div>
  ),
};

export const Playground: Story = {
  args: { defaultChecked: false, disabled: false, label: "سوییچ" },
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
    defaultChecked: { control: "boolean" },
  },
};
