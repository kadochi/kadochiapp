"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ServiceError } from "@/lib/http/errors";
import { getCurrentCustomer, logout as logoutRequest, startOtp as startOtpRequest, verifyOtp as verifyOtpRequest } from "./services/auth";
import type { AuthStatus, Customer, OtpStartResponse, StartOtpInput, VerifyOtpInput } from "./types";

type AuthContextValue = {
  customer: Customer | null;
  status: AuthStatus;
  error: Error | null;
  startOtp: (input: StartOtpInput) => Promise<OtpStartResponse>;
  verifyOtp: (input: VerifyOtpInput) => Promise<Customer>;
  refresh: () => Promise<Customer | null>;
  logout: () => Promise<void>;
};

const authChannel = "kadochi-auth";
const authStorageKey = "kadochi-auth-change";
const tabId = Math.random().toString(36).slice(2);
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthChange = { type: "changed"; sender: string };

function isAuthChange(value: unknown): value is AuthChange {
  return typeof value === "object" && value !== null
    && (value as { type?: unknown }).type === "changed"
    && typeof (value as { sender?: unknown }).sender === "string";
}

function publishAuthChange(): void {
  if (typeof window === "undefined") return;
  const change: AuthChange = { type: "changed", sender: tabId };
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(authChannel);
    channel.postMessage(change);
    channel.close();
  }
  try {
    window.localStorage.setItem(authStorageKey, JSON.stringify(change));
  } catch {
    // Private browsing can disable localStorage; BroadcastChannel remains a best-effort sync path.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (): Promise<Customer | null> => {
    setStatus("loading");
    setError(null);
    try {
      const nextCustomer = await getCurrentCustomer();
      setCustomer(nextCustomer);
      setStatus("authenticated");
      return nextCustomer;
    } catch (caught) {
      if (caught instanceof ServiceError && caught.detail.code === "unauthenticated") {
        setCustomer(null);
        setStatus("anonymous");
        return null;
      }
      const nextError = caught instanceof Error ? caught : new Error("Unable to refresh authentication.");
      setCustomer(null);
      setStatus("error");
      setError(nextError);
      throw nextError;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const refreshIfChanged = (value: unknown) => {
      if (isAuthChange(value) && value.sender !== tabId) void refresh().catch(() => undefined);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== authStorageKey || !event.newValue) return;
      try {
        refreshIfChanged(JSON.parse(event.newValue));
      } catch {
        // Ignore unrelated or corrupted local storage values.
      }
    };

    const channel = "BroadcastChannel" in window ? new BroadcastChannel(authChannel) : undefined;
    if (channel) channel.onmessage = (event: MessageEvent<unknown>) => refreshIfChanged(event.data);
    window.addEventListener("storage", handleStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  const startOtp = useCallback((input: StartOtpInput) => startOtpRequest(input), []);
  const verifyOtp = useCallback(async (input: VerifyOtpInput) => {
    const nextCustomer = await verifyOtpRequest(input);
    setCustomer(nextCustomer);
    setStatus("authenticated");
    setError(null);
    publishAuthChange();
    return nextCustomer;
  }, []);
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setCustomer(null);
      setStatus("anonymous");
      setError(null);
      publishAuthChange();
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ customer, status, error, startOtp, verifyOtp, refresh, logout }), [customer, status, error, startOtp, verifyOtp, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}

export function useOptionalAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}
