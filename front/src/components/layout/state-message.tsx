import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StateMessageProps = {
  imageSrc: string;
  imageAlt?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

/** A centered message for empty, loading, and other page states. */
function StateMessage({
  imageSrc,
  imageAlt = "",
  title,
  subtitle,
  actions,
  className,
}: Readonly<StateMessageProps>) {
  return (
    <section
      className={cn(
        "flex flex-col items-center bg-surface-background px-24 pb-32 pt-24 text-center font-sans",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        width={200}
        height={200}
        loading="lazy"
        className="block size-[200px] object-contain"
      />
      <h2 className="mb-8 mt-24 text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-text-primary">
        {title}
      </h2>
      {subtitle ? (
        <p className="m-0 text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-text-secondary">
          {subtitle}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-16 flex flex-wrap justify-center gap-8">{actions}</div>
      ) : null}
    </section>
  );
}

export default StateMessage;
