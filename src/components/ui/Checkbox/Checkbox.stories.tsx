import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const StatesRow: Story = {
  name: "States (default → hover → checked → hover-checked → disabled)",
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <Checkbox label="برچسب" />
      <div style={{ transform: "translateZ(0)" }}>
        <Checkbox label="هاور" />
      </div>
      <Checkbox label="انتخاب" defaultChecked />
      <div style={{ transform: "translateZ(0)" }}>
        <Checkbox label="هاور انتخاب" defaultChecked />
      </div>
      <Checkbox label="غیرفعال" disabled />
    </div>
  ),
};

export const Playground: Story = {
  args: { label: "عنوان", defaultChecked: false, disabled: false },
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
};
