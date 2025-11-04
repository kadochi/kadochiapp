import type { Meta, StoryObj } from "@storybook/react";
import Radio from "./Radio";

const meta: Meta<typeof Radio> = {
  title: "Components/Radio",
  component: Radio,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Radio>;

export const StatesRow: Story = {
  name: "States (default → hover → checked → hover-checked → disabled)",
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <Radio name="demo1" label="برچسب" />
      <div style={{ transform: "translateZ(0)" }}>
        <Radio name="demo2" label="هاور" />
      </div>
      <Radio name="demo3" label="انتخاب" defaultChecked />
      <div style={{ transform: "translateZ(0)" }}>
        <Radio name="demo4" label="هاور انتخاب" defaultChecked />
      </div>
      <Radio name="demo5" label="غیرفعال" disabled />
    </div>
  ),
};

export const Playground: Story = {
  args: { label: "گزینه", defaultChecked: false, disabled: false },
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
};
