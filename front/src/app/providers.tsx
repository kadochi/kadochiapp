"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@/modules/auth/context/session-context";
import { BasketProvider } from "@/modules/basket";
import { getQueryClient } from "@/lib/api/query-client";

export default function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: import("@/modules/auth/types").Session | null;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider initialSession={initialSession ?? null}>
        <BasketProvider>{children}</BasketProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
