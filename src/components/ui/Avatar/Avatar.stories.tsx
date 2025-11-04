import type { Meta, StoryObj } from "@storybook/react";
import Avatar from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithIcon: Story = {
  name: "With Icon",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Avatar size="small" />
      <Avatar size="medium" />
      <Avatar size="large" />
      <Avatar size="xlarge" />
    </div>
  ),
};

export const GlyphFallback: Story = {
  name: "Glyph (Initials)",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Avatar size="small" name="آیدین بهرامن" />
      <Avatar size="medium" name="آیدین بهرامن" />
      <Avatar size="large" name="آیدین بهرامن" />
      <Avatar size="xlarge" name="آیدین بهرامن" />
    </div>
  ),
};

export const WithImage: Story = {
  name: "With Image",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Avatar size="small" src="images/avatar-sample-image.png" alt="user" />
      <Avatar size="medium" src="images/avatar-sample-image.png" alt="user" />
      <Avatar size="large" src="images/avatar-sample-image.png" alt="user" />
      <Avatar size="xlarge" src="images/avatar-sample-image.png" alt="user" />
    </div>
  ),
};

export const AllSizes: Story = {
  name: "All Sizes (Mixed)",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Avatar size="small" />
      <Avatar size="medium" name="Kadochi Brand" />
      <Avatar size="large" src="images/avatar-sample-image.png" />
      <Avatar size="xlarge" />
    </div>
  ),
};
