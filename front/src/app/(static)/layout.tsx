"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutContent } from "@/components/layout/layout-content";

const pageTitles: Record<string, string> = {
  "/about": "درباره ما",
  "/contact": "تماس با ما",
  "/faq": "سوالات متداول",
  "/privacy": "حریم خصوصی",
  "/shipping": "روش ارسال",
  "/terms": "قوانین و مقررات",
};

export default function StaticLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <LayoutContent
      headerProps={{
        variant: "internal",
        title: pageTitles[pathname],
        backUrl: "/",
      }}
    >
      {children}
    </LayoutContent>
  );
}
