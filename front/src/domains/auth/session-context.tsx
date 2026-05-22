"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Session } from "@/domains/auth/models/session";

type Ctx = {
  session: Session | null;
  setSession: (s: Session | null) => void;
  refreshSession: () => Promise<Session | null>;
};

const SessionCtx = createContext<Ctx | undefined>(undefined);

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
}) {
  const [session, setSession] = useState<Session | null>(
    initialSession ?? null
  );

  const refreshSession = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const json = await r.json().catch(() => ({} as any));
      if (json?.session) {
        setSession(json.session as Session);
        return json.session as Session;
      }
      setSession(null);
      return null;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const onFocus = () => refreshSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshSession]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kadochi:session:broadcast") refreshSession();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshSession]);

  return (
    <SessionCtx.Provider value={{ session, setSession, refreshSession }}>
      {children}
    </SessionCtx.Provider>
  );
}

/** Strict hook: throws if provider is missing. */
export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider />");
  }
  return ctx;
}

/** Lenient hook: returns undefined if provider is missing (no throw). */
export function useOptionalSession() {
  return useContext(SessionCtx);
}
