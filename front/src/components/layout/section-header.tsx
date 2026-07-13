import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leftSlot?: ReactNode;
  labelSlot?: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4";
};

/** A right-to-left section heading with optional metadata and actions. */
function SectionHeader({
  title,
  subtitle,
  leftSlot,
  labelSlot,
  className,
  as: Heading = "h2",
}: Readonly<SectionHeaderProps>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-16 bg-surface-background px-16 pb-16 pt-24 [direction:rtl]",
        className,
      )}
    >
      <div className="grid min-w-0 gap-4">
        <div className="inline-flex min-w-0 items-center gap-8">
          <Heading className="m-0 font-sans text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis min-[580px]:text-title-18 min-[580px]:leading-[var(--text-title-18--line-height)]">
            {title}
          </Heading>
          {labelSlot ? (
            <span className="inline-flex items-center">{labelSlot}</span>
          ) : null}
        </div>

        {subtitle ? (
          <div className="break-words font-sans text-label-12 leading-[var(--text-label-12--line-height)] text-surface-neutral-mid-emphasis min-[580px]:text-body-14 min-[580px]:leading-[var(--text-body-14--line-height)]">
            {subtitle}
          </div>
        ) : null}
      </div>

      {leftSlot ? (
        <div className="inline-flex shrink-0 items-center gap-8">{leftSlot}</div>
      ) : null}
    </div>
  );
}

export default SectionHeader;
