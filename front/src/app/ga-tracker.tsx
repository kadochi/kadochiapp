"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function GATracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (!GA_ID) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    // Google Analytics defines gtag after its external script loads.
    // @ts-expect-error gtag is not part of the built-in Window type.
    window.gtag?.("config", GA_ID, { page_path: url });
  }, [pathname, searchParams, GA_ID]);

  return null;
}
