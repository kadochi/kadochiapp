import type { Meta, StoryObj } from "@storybook/react";
import Chip from "./Chip";
import { Filter, X, ChevronDown } from "lucide-react";

type StoryProps = React.ComponentProps<typeof Chip> & {
  showLeadingIcon?: boolean;
  showTrailingIcon?: boolean;
};

const meta: Meta<StoryProps> = {
  title: "Components/Chip",
  parameters: { layout: "centered" },

  component: Chip as any,
  argTypes: {
    state: { control: "select", options: ["default", "active", "disable"] },
    showLeadingIcon: { name: "leadingIcon", control: "boolean" },
    showTrailingIcon: { name: "trailingIcon", control: "boolean" },
    leadingBadge: {
      control: { type: "number", min: 0, max: 99, step: 1 },
      description:
        "Badge only shows in active; in disable shows with disabled colors if value exists",
    },
    children: { control: "text" },
  },
  args: {
    state: "default",
    children: "فیلترها",
    showLeadingIcon: true,
    showTrailingIcon: false,
    leadingBadge: undefined,
  },

  render: (args) => {
    const leadingIcon = args.showLeadingIcon ? <Filter size={16} /> : undefined;
    const trailingIcon = args.showTrailingIcon ? <X size={16} /> : undefined;

    const { showLeadingIcon, showTrailingIcon, ...rest } = args;

    return (
      <Chip {...rest} leadingIcon={leadingIcon} trailingIcon={trailingIcon} />
    );
  },
};
export default meta;

type Story = StoryObj<StoryProps>;

export const Playground: Story = {};

export const ActiveWithBadge: Story = {
  args: {
    state: "active",
    leadingBadge: 2,
    showLeadingIcon: true,
    showTrailingIcon: false,
    children: "فیلترها",
  },
};

export const SortDropdown: Story = {
  args: {
    state: "default",
    children: "مرتب‌سازی",
    showLeadingIcon: false,
    showTrailingIcon: true,
  },
  render: (args) => {
    const { showLeadingIcon, showTrailingIcon, ...rest } = args;
    return <Chip {...rest} trailingIcon={<ChevronDown size={16} />} />;
  },
};

export const DisabledWithBadge: Story = {
  args: {
    state: "disable",
    leadingBadge: 2,
    showLeadingIcon: true,
    showTrailingIcon: true,
    children: "فیلترها",
  },
};
