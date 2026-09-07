"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type TopBannerProps = {
  className?: string;
};

function isStorefrontPromotionRoute(pathname: string) {
  return pathname === "/" || pathname === "/products" || pathname.startsWith("/product/");
}

/** A dismissible, text-only campaign announcement for storefront entry and product routes. */
function TopBanner({ className }: Readonly<TopBannerProps>) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  // Do not persist dismissal: a refreshed page intentionally shows the campaign again.
  if (!isVisible || !isStorefrontPromotionRoute(pathname)) return null;

  return (
    <aside
      aria-label="پیشنهاد ویژه"
      className={cn(
        "relative flex h-48 w-full items-center justify-center gap-4 bg-primary px-16 text-label-12 font-regular leading-[var(--text-label-12--line-height)] text-on-primary",
        className,
      )}
      dir="rtl"
    >
      <span>کد ۱۰٪ تخفیف اولین سفارش:</span>
      <strong className="font-bold [direction:ltr]">HELLOKADOCHI</strong>
      <button
        aria-label="بستن پیشنهاد ویژه"
        className="absolute left-12 grid size-28 place-items-center rounded-rounded text-on-primary transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
        onClick={() => setIsVisible(false)}
        type="button"
      >
        <X aria-hidden className="size-18" />
      </button>
    </aside>
  );
}

export { TopBanner };
export default TopBanner;
