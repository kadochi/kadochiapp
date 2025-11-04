"use client";

import React from "react";
import { BasketProvider } from "@/domains/basket/state/basket-context";
import { SessionProvider } from "@/domains/auth/session-context";
import type { Session } from "@/domains/auth/models/session";

export default function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  return (
    <SessionProvider initialSession={initialSession ?? null}>
      <BasketProvider>{children}</BasketProvider>
    </SessionProvider>
  );
}
