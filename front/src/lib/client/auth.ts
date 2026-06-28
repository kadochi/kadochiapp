import { api, postJSON } from "@/lib/api/axios";

export async function apiStartOtp(phone: string) {
  return postJSON<{ ok: boolean; ttlSec?: number }>("/api/auth/otp/start", {
    phone,
  });
}

export async function apiVerifyOtp(phone: string, code: string, csrf?: string) {
  return postJSON<{ ok: boolean; userId?: number }>(
    "/api/auth/otp/verify",
    { phone, code },
    csrf ? { headers: { "x-csrf": csrf } } : undefined,
  );
}

export async function apiLogout() {
  // Rejects (via the response interceptor) on any non-2xx status.
  await postJSON<unknown>("/api/auth/logout");
}

export async function apiMe() {
  // Mirror the previous fetch behavior: never throw on a non-2xx status,
  // just read whatever body came back.
  const res = await api.get("/api/me", {
    validateStatus: () => true,
    headers: { "Cache-Control": "no-cache" },
  });
  const j = (res.data ?? {}) as {
    ok?: boolean;
    user?: unknown;
    csrf?: string | null;
  };
  return {
    ok: !!j?.ok,
    user: (j?.user ?? null) as {
      id: number;
      email?: string | null;
      phone?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null,
    csrf: j?.csrf ?? null,
  };
}
