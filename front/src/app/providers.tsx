"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@/domains/auth/session-context";
import { BasketProvider } from "@/domains/basket/state/basket-context";

export default function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: import("@/domains/auth/models/session").Session | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 2 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider initialSession={initialSession ?? null}>
        <BasketProvider>{children}</BasketProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
