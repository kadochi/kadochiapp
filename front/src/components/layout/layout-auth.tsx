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
    <section className="mx-auto flex min-h-[calc(100dvh-var(--spacing-88))] w-full max-w-[580px] flex-col justify-center bg-surface-background pb-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))]">
      <div className="flex w-full flex-col items-center gap-32">
        <div className="flex w-full flex-col items-center gap-8 px-24">
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
