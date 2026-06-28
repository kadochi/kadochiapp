"use client";

import { useQuery } from "@tanstack/react-query";
import { apiMe } from "@/lib/client/auth";
import { queryKeys } from "@/lib/queryKeys";

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.session(),
    queryFn: apiMe,
    staleTime: 60_000,
    retry: false,
  });

  return {
    user: data?.user ?? null,
    csrf: data?.csrf ?? null,
    isAuthenticated: data?.ok ?? false,
    isLoading,
  };
}
