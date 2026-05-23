"use client";

import React from "react";
import { SessionProvider } from "@/domains/auth/session-context";
import { BasketProvider } from "@/domains/basket/state/basket-context";

export default function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: import("@/domains/auth/models/session").Session | null;
}) {
  return (
    <SessionProvider initialSession={initialSession ?? null}>
      <BasketProvider>{children}</BasketProvider>
    </SessionProvider>
  );
}
