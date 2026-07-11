import { RadioGroup, RadioGroupItem } from "./ui/radio";

const tones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];

const sizes = ["small", "medium"] as const;

type Tone = (typeof tones)[number]["value"];
type Size = (typeof sizes)[number];

function StateColumn({ tone, size }: { tone: Tone; size: Size }) {
  return (
    <div className="flex flex-col items-start gap-16">
      <RadioGroup tone={tone} size={size} aria-label="انتخاب‌نشده">
        <RadioGroupItem value="a" label="انتخاب‌نشده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" aria-label="انتخاب‌شده">
        <RadioGroupItem value="a" label="انتخاب‌شده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} disabled aria-label="غیرفعال">
        <RadioGroupItem value="a" label="غیرفعال" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" disabled aria-label="غیرفعال و انتخاب‌شده">
        <RadioGroupItem value="a" label="غیرفعال و انتخاب‌شده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} invalid aria-label="نامعتبر">
        <RadioGroupItem value="a" label="نامعتبر" />
      </RadioGroup>
    </div>
  );
}

function RadioPreview() {
  return (
    <section className="mt-16" aria-labelledby="radio-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="radio-heading" className="text-heading-24 font-regular">
          رادیو باتن
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۲ رنگ‌مایه · ۲ اندازه · حالت‌های انتخاب‌شده، غیرفعال و نامعتبر
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                رنگ‌مایه
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
          aria-label="گزینه‌های رضایت"
          className="flex-row flex-wrap gap-x-32 gap-y-16"
        >
          <RadioGroupItem value="agree" label="فیلد الزامی" />
          <RadioGroupItem
            value="rich"
            label={<><span className="font-bold">متنوع</span> با محتوای برچسب</>}
          />
          <RadioGroupItem value="plain" aria-label="رادیو باتن بدون برچسب نمایانی" />
        </RadioGroup>
      </div>

      <fieldset className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <legend className="sr-only">ترجیح اطلاع‌رسانی</legend>
        <RadioGroup
          name="notification"
          defaultValue="email"
          aria-label="ترجیح اطلاع‌رسانی"
          className="flex-row flex-wrap gap-x-32 gap-y-16"
        >
          <RadioGroupItem value="email" label="ایمیل" />
          <RadioGroupItem value="sms" label="پیامک" />
          <RadioGroupItem
            value="push"
            label={<><span className="font-bold">اعلان‌های</span> فوری</>}
          />
          <RadioGroupItem value="disabled" disabled label="گزینه غیرفعال" />
        </RadioGroup>
      </fieldset>
    </section>
  );
}

export { RadioPreview };
