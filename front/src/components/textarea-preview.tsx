"use client";

import { useState } from "react";
import { Info, MessageSquare } from "lucide-react";
import { TextArea } from "./ui/textarea";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  {
    name: "Default",
    props: {
      description: "Optional supporting text.",
      label: "Description",
      required: true,
    },
  },
  {
    name: "Error",
    props: {
      defaultValue: "Too short",
      description: "Enter at least 20 characters.",
      label: "Description",
      status: "error" as const,
    },
  },
  {
    name: "Success",
    props: {
      defaultValue: "A complete description.",
      description: "Looks good.",
      label: "Description",
      status: "success" as const,
    },
  },
  {
    name: "Disabled",
    props: {
      defaultValue: "Editing is unavailable.",
      description: "This field cannot be changed.",
      disabled: true,
      label: "Description",
    },
  },
];

function ControlledCountExample() {
  const [value, setValue] = useState("A short product description.");

  return (
    <TextArea
      description="Controlled value with a character count."
      label="Product description"
      maxLength={120}
      showCount
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function TextAreaPreview() {
  return (
    <section className="mt-16" aria-labelledby="textarea-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="textarea-heading" className="text-heading-24 font-regular">
          Textarea
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          3 sizes · default, error, success, disabled and focus states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-250 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                State
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map(({ name, props }, index) => (
              <tr
                key={name}
                className={index === states.length - 1 ? "" : "border-b border-border-low-emphasis"}
              >
                <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="min-w-80 px-5 py-5 align-top">
                    <TextArea {...props} placeholder="Write a description..." size={size} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <ControlledCountExample />
        <TextArea
          defaultValue="Share the important details."
          description="Leading icon and LTR direction."
          dir="ltr"
          label="Notes"
          leadingIcon={<MessageSquare />}
          placeholder="Add a note..."
          showCount
        />
        <TextArea
          description="An accessible name can replace a visible label."
          aria-label="Internal note"
          leadingIcon={<Info />}
          placeholder="Internal note..."
          size="sm"
        />
      </div>
    </section>
  );
}

export { TextAreaPreview };
