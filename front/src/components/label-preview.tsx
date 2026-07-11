import { Check, CircleAlert, Link as LinkIcon } from "lucide-react";
import { Label } from "./ui/label";

const variants = [
  { name: "Success", value: "success" as const },
  { name: "Secondary", value: "secondary" as const },
  { name: "Warning", value: "warning" as const },
  { name: "Danger", value: "danger" as const },
  { name: "Neutral", value: "neutral" as const },
];

const appearances = ["solid", "soft", "gradient"] as const;
const sizes = ["sm", "md"] as const;

function LabelPreview() {
  return (
    <section className="mt-16" aria-labelledby="label-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="label-heading" className="text-heading-24 font-regular">
          Label
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          5 variants · 3 appearances · 2 sizes
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-225 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                Variant
              </th>
              {appearances.map((appearance) => (
                <th key={appearance} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                  {appearance}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map(({ name, value }, index) => (
              <tr key={value} className={index === variants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                  {name}
                </th>
                {appearances.map((appearance) => (
                  <td key={appearance} className="px-5 py-5">
                    <div className="flex flex-wrap items-center gap-8">
                      {sizes.map((size) => (
                        <Label key={size} appearance={appearance} leadingIcon={<Check />} size={size} variant={value}>
                          {size === "sm" ? "Small" : "Medium"}
                        </Label>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <Label leadingIcon={<CircleAlert />} variant="warning">
          With icon
        </Label>
        <Label appearance="soft" variant="neutral">
          Text only
        </Label>
        <Label asChild appearance="gradient" leadingIcon={<LinkIcon />} variant="secondary">
          <a href="#label-heading">Label link</a>
        </Label>
        <Label className="uppercase tracking-wide" variant="danger">
          Custom class
        </Label>
      </div>
    </section>
  );
}

export { LabelPreview };
