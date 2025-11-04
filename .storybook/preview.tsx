import React from "react";
import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import "../src/styles/tokens.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { expanded: true },
    options: {
      storySort: {
        order: ["Components", ["Button"], "Pages"],
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        style={{
          fontFamily: "var(--font-sans)",
          background: "var(--surface-background)",
          padding: 24,
          minHeight: "100vh",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
