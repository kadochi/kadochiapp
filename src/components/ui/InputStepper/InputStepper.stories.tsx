import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import InputStepper from "./InputStepper";

const meta: Meta<typeof InputStepper> = {
  title: "Components/InputStepper",
  component: InputStepper,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["product", "basket"],
    },
    min: { control: { type: "number", min: 0 } },
    max: { control: { type: "number", min: 0 } },
    disabled: { control: "boolean" },
  },
  args: {
    type: "product",
    min: 1,
    max: 5,
    value: 1,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<typeof InputStepper>;

/** Controlled wrapper so the knob changes reflect immediately */
function Controlled(props: React.ComponentProps<typeof InputStepper>) {
  const [v, setV] = React.useState(props.value ?? 1);
  React.useEffect(() => {
    setV(props.value ?? 1);
  }, [props.value]);
  return (
    <div style={{ padding: 24, background: "var(--surface-background)" }}>
      <InputStepper {...props} value={v} onChange={setV} />
    </div>
  );
}

export const Product: Story = {
  name: "Product (56px / outline)",
  args: { type: "product", value: 1, min: 1, max: 3 },
  render: (args) => <Controlled {...args} />,
};

export const Basket: Story = {
  name: "Basket (32px / chip controls)",
  args: { type: "basket", value: 2, min: 1, max: 6 },
  render: (args) => <Controlled {...args} />,
};

export const Minimum: Story = {
  name: "Minimum state (trash on left)",
  args: { type: "product", value: 1, min: 1, max: 5 },
  render: (args) => <Controlled {...args} />,
};

export const Maximum: Story = {
  name: "Maximum state (+ disabled)",
  args: { type: "basket", value: 3, min: 1, max: 3 },
  render: (args) => <Controlled {...args} />,
};
