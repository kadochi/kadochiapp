import type { ReactNode } from "react";

type LayoutAuthProps = {
  title: string;
  description: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
};

/** Mobile-first authentication layout matching the established Kadochi login flow. */
export function LayoutAuth({
  title,
  description,
  headerAction,
  children,
}: LayoutAuthProps) {
  return (
    <section className="mx-auto min-h-[calc(100dvh-var(--spacing-88))] w-full max-w-[580px] bg-surface-background">
      <div className="grid gap-32 pt-80 pb-120">
        <div className="mt-80 grid gap-8 px-24">
          <h1 className="mb-12 font-sans text-title-18 font-bold leading-[var(--text-title-18--line-height)] text-surface-neutral-high-emphasis">
            {title}
          </h1>
          <div className="font-sans text-body-16 font-regular leading-[var(--text-body-16--line-height)] text-surface-neutral-mid-emphasis">
            {description}
          </div>
          {headerAction}
        </div>
        {children}
      </div>
    </section>
  );
}
