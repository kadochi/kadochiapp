"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ServiceError } from "@/lib/http/errors";
import {
  AuthRefreshCoordinator,
  publishAuthChange,
  statusAfterRefreshFailure,
  subscribeToAuthChanges,
} from "./auth-coordination";
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

const tabId = Math.random().toString(36).slice(2);
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const authRefreshRetryMs = 400;

async function currentCustomerWithRetry(): Promise<Customer | null> {
  try {
    return await getCurrentCustomer();
  } catch (error) {
    if (error instanceof ServiceError && !error.detail.retryable) throw error;
    await new Promise((resolve) => window.setTimeout(resolve, authRefreshRetryMs));
    return getCurrentCustomer();
  }
}

export function AuthProvider({ children }: { children: ReactNode; hasStoredSession?: boolean }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  // Cookie presence is only a hint; authenticated means /current has supplied
  // a confirmed customer during this provider's lifetime.
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const customerRef = useRef<Customer | null>(null);
  const [refreshCoordinator] = useState(() => new AuthRefreshCoordinator<Customer | null>());

  const refresh = useCallback((): Promise<Customer | null> => {
    // Session validation is a background operation for an already signed-in
    // customer. Keep that state visible until the server confirms otherwise.
    setStatus(customerRef.current ? "authenticated" : "loading");
    setError(null);
    return refreshCoordinator.run(
      async () => {
        try {
          return await currentCustomerWithRetry();
        } catch (caught) {
          if (caught instanceof ServiceError && caught.detail.code === "unauthenticated") return null;
          throw caught;
        }
      },
      (nextCustomer) => {
        customerRef.current = nextCustomer;
        setCustomer(nextCustomer);
        setStatus(nextCustomer ? "authenticated" : "anonymous");
      },
      (caught) => {
        const nextError = caught instanceof Error ? caught : new Error("Unable to refresh authentication.");
        // Keep a previously confirmed customer visible during a temporary
        // failure, but never promote a bare cookie hint to authenticated.
        setStatus(statusAfterRefreshFailure(customerRef.current));
        setError(nextError);
      },
    );
  }, [refreshCoordinator]);

  useEffect(() => {
    // Do not defer the initial check: a 15-second delay left new page loads
    // visibly anonymous even though their authentication cookie was present.
    const timer = window.setTimeout(() => void refresh().catch(() => undefined), 0);
    return () => {
      window.clearTimeout(timer);
      refreshCoordinator.invalidate();
    };
  }, [refresh, refreshCoordinator]);

  useEffect(() => {
    return subscribeToAuthChanges(window, tabId, () => {
      refreshCoordinator.invalidate();
      void refresh().catch(() => undefined);
    });
  }, [refresh, refreshCoordinator]);

  const startOtp = useCallback((input: StartOtpInput) => startOtpRequest(input), []);
  const verifyOtp = useCallback(async (input: VerifyOtpInput) => {
    const nextCustomer = await verifyOtpRequest(input);
    refreshCoordinator.invalidate();
    customerRef.current = nextCustomer;
    setCustomer(nextCustomer);
    setStatus("authenticated");
    setError(null);
    publishAuthChange(window, tabId);
    return nextCustomer;
  }, [refreshCoordinator]);
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      refreshCoordinator.invalidate();
      customerRef.current = null;
      setCustomer(null);
      setStatus("anonymous");
      setError(null);
      publishAuthChange(window, tabId);
    }
  }, [refreshCoordinator]);

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
