"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiStartOtp, apiVerifyOtp, apiLogout } from "../services/otp";
import type { Session } from "../types";

export function useSessionQuery() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const r = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await r.json().catch(() => ({ session: null }));
      return (json?.session ?? null) as Session | null;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useOtpStart() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiStartOtp(phone);
      return res;
    },
  });
}

export function useOtpVerify() {
  return useMutation({
    mutationFn: async ({
      phone,
      code,
      csrf,
    }: {
      phone: string;
      code: string;
      csrf?: string;
    }) => {
      const res = await apiVerifyOtp(phone, code, csrf);
      return res;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiLogout();
    },
  });
}
