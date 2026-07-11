"use client";

import { useState } from "react";
import { AtSign, Eye, LockKeyhole, Search } from "lucide-react";
import { Input } from "./ui/input";

const sizes = ["sm", "md", "lg"] as const;

const states = [
  {
    name: "Default",
    props: {
      description: "Helpful supporting text.",
      label: "Full name",
      required: true,
    },
  },
  {
    name: "Error",
    props: {
      defaultValue: "invalid-email",
      description: "Enter a valid email address.",
      label: "Email address",
      status: "error" as const,
      type: "email",
    },
  },
  {
    name: "Success",
    props: {
      defaultValue: "sahar@example.com",
      description: "This email address is available.",
      label: "Email address",
      status: "success" as const,
      type: "email",
    },
  },
  {
    name: "Disabled",
    props: {
      defaultValue: "Editing is unavailable.",
      description: "This field cannot be changed.",
      disabled: true,
      label: "Account name",
    },
  },
];

function ControlledInputExample() {
  const [value, setValue] = useState("");

  return (
    <Input
      description={value ? `Searching for “${value}”.` : "Start typing to search."}
      label="Search products"
      leadingIcon={<Search />}
      placeholder="Search..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function InputPreview() {
  return (
    <section className="mt-16" aria-labelledby="input-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="input-heading" className="text-heading-24 font-regular">
          Input
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
                    <Input {...props} placeholder="Enter a value..." size={size} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
        <ControlledInputExample />
        <Input
          defaultValue="sahar@example.com"
          description="Leading and trailing icons with LTR content."
          dir="ltr"
          label="Email address"
          leadingIcon={<AtSign />}
          trailingIcon={<Eye />}
          type="email"
        />
        <Input
          description="Native input props, such as autocomplete and input mode, pass through."
          inputMode="numeric"
          label="Verification code"
          placeholder="123456"
          autoComplete="one-time-code"
        />
        <Input
          aria-label="Password without visible label"
          leadingIcon={<LockKeyhole />}
          placeholder="Password"
          type="password"
          size="sm"
        />
      </div>
    </section>
  );
}

export { InputPreview };
