import { RadioGroup, RadioGroupItem } from "./ui/radio";

const tones = [
  { name: "Primary", value: "primary" as const },
  { name: "Secondary", value: "secondary" as const },
];

const sizes = ["small", "medium"] as const;

type Tone = (typeof tones)[number]["value"];
type Size = (typeof sizes)[number];

function StateColumn({ tone, size }: { tone: Tone; size: Size }) {
  return (
    <div className="flex flex-col items-start gap-16">
      <RadioGroup tone={tone} size={size} aria-label="Unchecked">
        <RadioGroupItem value="a" label="Unchecked" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" aria-label="Checked">
        <RadioGroupItem value="a" label="Checked" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} disabled aria-label="Disabled">
        <RadioGroupItem value="a" label="Disabled" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" disabled aria-label="Disabled checked">
        <RadioGroupItem value="a" label="Disabled checked" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} invalid aria-label="Invalid">
        <RadioGroupItem value="a" label="Invalid" />
      </RadioGroup>
    </div>
  );
}

function RadioPreview() {
  return (
    <section className="mt-16" aria-labelledby="radio-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="radio-heading" className="text-heading-24 font-regular">
          Radio
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 tones · 2 sizes · checked, disabled, and invalid states
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                Tone
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tones.map(({ name, value }, index) => (
              <tr key={value} className={index === tones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {sizes.map((size) => (
                  <td key={size} className="px-5 py-5 align-top">
                    <StateColumn tone={value} size={size} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <RadioGroup
          name="terms"
          required
          defaultValue="agree"
          aria-label="Consent options"
          className="flex-row flex-wrap gap-x-32 gap-y-16"
        >
          <RadioGroupItem value="agree" label="Required field" />
          <RadioGroupItem
            value="rich"
            label={<><span className="font-bold">Rich</span> label content</>}
          />
          <RadioGroupItem value="plain" aria-label="Radio without a visible label" />
        </RadioGroup>
      </div>

      <fieldset className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <legend className="sr-only">Notification preference</legend>
        <RadioGroup
          name="notification"
          defaultValue="email"
          aria-label="Notification preference"
          className="flex-row flex-wrap gap-x-32 gap-y-16"
        >
          <RadioGroupItem value="email" label="Email" />
          <RadioGroupItem value="sms" label="SMS" />
          <RadioGroupItem
            value="push"
            label={<><span className="font-bold">Push</span> notifications</>}
          />
          <RadioGroupItem value="disabled" disabled label="Disabled option" />
        </RadioGroup>
      </fieldset>
    </section>
  );
}

export { RadioPreview };
