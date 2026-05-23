export async function apiStartOtp(phone: string) {
  const res = await fetch("/api/auth/otp/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error("OTP_START_FAILED");
  return (await res.json()) as { ok: boolean; ttlSec?: number };
}

export async function apiVerifyOtp(phone: string, code: string, csrf?: string) {
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf": csrf } : {}),
    },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "OTP_VERIFY_FAILED");
  }
  return (await res.json()) as { ok: boolean; userId?: number };
}

export async function apiLogout() {
  const res = await fetch("/api/auth/logout", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("LOGOUT_FAILED");
}

export async function apiMe() {
  const res = await fetch("/api/me", {
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  return {
    ok: !!j?.ok,
    user: j?.user ?? null,
    csrf: j?.csrf ?? null,
  } as {
    ok: boolean;
    user: {
      id: number;
      email?: string | null;
      phone?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    csrf: string | null;
  };
}
