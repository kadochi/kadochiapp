import { Check, CircleAlert, Link as LinkIcon } from "lucide-react";
import { Label } from "./ui/label";

const variants = [
  { name: "موفقیت", value: "success" as const },
  { name: "ثانویه", value: "secondary" as const },
  { name: "هشدار", value: "warning" as const },
  { name: "خطر", value: "danger" as const },
  { name: "خنثی", value: "neutral" as const },
];

const appearances = ["solid", "soft", "gradient"] as const;
const sizes = ["sm", "md"] as const;

function LabelPreview() {
  return (
    <section className="mt-16" aria-labelledby="label-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="label-heading" className="text-heading-24 font-regular">
          برچسب
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۵ نوع · ۳ ظاهر · ۲ اندازه
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-225 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                نوع
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
                          {size === "sm" ? "کوچک" : "متوسط"}
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
          با آیکون
        </Label>
        <Label appearance="soft" variant="neutral">
          فقط متن
        </Label>
        <Label asChild appearance="gradient" leadingIcon={<LinkIcon />} variant="secondary">
          <a href="#label-heading">پیوند برچسب</a>
        </Label>
        <Label className="uppercase tracking-wide" variant="danger">
          کلاس دلخواه
        </Label>
      </div>
    </section>
  );
}

export { LabelPreview };
