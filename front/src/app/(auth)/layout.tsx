import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-surface-background">
      <Header backUrl="/" title="" variant="internal" />
      <main>{children}</main>
    </div>
  );
}
