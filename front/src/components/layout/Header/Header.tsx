"use client";

import HeaderInternal from "./HeaderInternal";
import HeaderDefault from "./HeaderDefault";

type HeaderVariant = "default" | "internal";

type HeaderProps = {
  variant?: HeaderVariant;

  // props مخصوص default
  showBack?: boolean;
  backHref?: string;
  backAriaLabel?: string;

  // props مخصوص internal
  title?: string;
  backUrl?: string;
};

export default function Header({
  variant = "default",
  showBack = false,
  backHref,
  backAriaLabel = "بازگشت",
  title,
  backUrl,
}: HeaderProps) {
  if (variant === "internal") {
    return <HeaderInternal title={title} backUrl={backUrl} />;
  }

  return (
    <HeaderDefault
      showBack={showBack}
      backHref={backHref}
      backAriaLabel={backAriaLabel}
    />
  );
}
