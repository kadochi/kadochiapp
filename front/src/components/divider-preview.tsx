import type { ReactNode } from "react";
import { Divider } from "./ui/divider";

const spacerSizes = ["sm", "md", "lg"] as const;

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-m border border-border-low-emphasis bg-surface-background p-5">
      {children}
    </div>
  );
}

function DividerPreview() {
  return (
    <section className="mt-16" aria-labelledby="divider-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="divider-heading" className="text-heading-24 font-regular">
          جداکننده
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          نوع خطی و فاصله‌گذار · پیکربندی فاصله‌دار · ۳ اندازه فاصله‌گذار
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PreviewFrame>
          <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
            خط تمام‌عرض (پیش‌فرض)
          </p>
          <Divider />
        </PreviewFrame>

        <PreviewFrame>
          <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
            خط با فاصله
          </p>
          <Divider inset />
        </PreviewFrame>
      </div>

      <div className="mt-4 overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
        <table className="w-full min-w-175 border-collapse text-left">
          <thead className="border-b border-border-low-emphasis">
            <tr>
              <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                اندازه فاصله‌گذار
              </th>
              <th scope="col" className="px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                تمام عرض
              </th>
              <th scope="col" className="px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                فاصله‌دار
              </th>
            </tr>
          </thead>
          <tbody>
            {spacerSizes.map((size, index) => (
              <tr
                key={size}
                className={
                  index === spacerSizes.length - 1
                    ? ""
                    : "border-b border-border-low-emphasis"
                }
              >
                <th scope="row" className="px-5 py-5 text-label-14 font-regular uppercase">
                  {size}
                </th>
                <td className="px-5 py-5">
                  <Divider variant="spacer" size={size} />
                </td>
                <td className="px-5 py-5">
                  <Divider inset size={size} variant="spacer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { DividerPreview };
