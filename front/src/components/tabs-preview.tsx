import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const sizes = ["sm", "md", "lg"] as const;

const tones = [
  { name: "Primary", value: "primary" as const },
  { name: "Secondary", value: "secondary" as const },
];

const panels = [
  { value: "overview", label: "نمای کلی", body: "خلاصه‌ای از وضعیت حساب شما." },
  { value: "activity", label: "فعالیت", body: "آخرین رویدادها و تراکنش‌ها." },
  { value: "settings", label: "تنظیمات", body: "مدیریت ترجیحات و امنیت." },
];

function TabsExample({
  tone,
  size,
}: {
  tone: (typeof tones)[number]["value"];
  size: (typeof sizes)[number];
}) {
  return (
    <Tabs defaultValue="overview" tone={tone} size={size}>
      <TabsList>
        {panels.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map((panel) => (
        <TabsContent key={panel.value} value={panel.value}>
          {panel.body}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TabsPreview() {
  return (
    <section className="mt-16" aria-labelledby="tabs-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="tabs-heading" className="text-heading-24 font-regular">
          Tabs
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          2 tones · 3 sizes · panels · RTL keyboard nav
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-[56.25rem] border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                Tone
              </th>
              {sizes.map((size) => (
                <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
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
                    <div className="min-w-[16rem]">
                      <TabsExample tone={value} size={size} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { TabsPreview };
