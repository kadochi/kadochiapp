"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/** Basket data shape: productId -> quantity */
export type BasketMap = Record<string, number>;

export type BasketContextValue = {
  basket: BasketMap;
  basketCount: number;
  /** add quantity (default 1) to a product id */
  addToBasket: (id: string, qty?: number) => void;
  /** remove quantity (default 1) from a product id (removes key if <=0) */
  removeFromBasket: (id: string, qty?: number) => void;
  /** replace the whole map (legacy API compatibility) */
  updateQuantity: (next: BasketMap) => void;
  /** set an exact quantity for a single id (0 removes it) */
  setItemQuantity: (id: string, qty: number) => void;
  /** clear basket completely */
  clearBasket: () => void;
};

const BasketContext = createContext<BasketContextValue | undefined>(undefined);

/** namespaced localStorage key (v1 for future migrations) */
const STORAGE_KEY = "kadochi:basket:v1";

function safeParseBasket(json: string | null): BasketMap {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as BasketMap) : {};
  } catch {
    return {};
  }
}

/**
 * Provider for basket state.
 * Note: this file intentionally uses `.ts` (no JSX).
 */
export function BasketProvider({ children }: { children: ReactNode }) {
  // lazy init from localStorage (client only)
  const [basket, setBasket] = useState<BasketMap>(() => {
    if (typeof window === "undefined") return {};
    return safeParseBasket(localStorage.getItem(STORAGE_KEY));
  });

  // persist to localStorage (only if changed)
  useEffect(() => {
    try {
      const next = JSON.stringify(basket);
      if (localStorage.getItem(STORAGE_KEY) !== next) {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {}
  }, [basket]);

  // sync across tabs/windows
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = safeParseBasket(e.newValue);
      setBasket((prev) => {
        // جلوگیری از ست غیرضروری
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const basketCount = useMemo(
    () => Object.values(basket).reduce((sum, n) => sum + n, 0),
    [basket]
  );

  // ------- stable callbacks -------
  const addToBasket = useCallback((id: string, qty = 1) => {
    const q = Math.max(0, Math.trunc(qty) || 0);
    if (!id || q === 0) return;
    setBasket((prev) => ({ ...prev, [id]: (prev[id] || 0) + q }));
  }, []);

  const removeFromBasket = useCallback((id: string, qty = 1) => {
    const q = Math.max(0, Math.trunc(qty) || 0);
    if (!id || q === 0) return;
    setBasket((prev) => {
      const cur = prev[id] || 0;
      const nextQty = cur - q;
      if (nextQty <= 0) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextQty };
    });
  }, []);

  const setItemQuantity = useCallback((id: string, qty: number) => {
    const q = Math.max(0, Math.trunc(qty) || 0);
    setBasket((prev) => {
      if (!id) return prev;
      if (q <= 0) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      if (prev[id] === q) return prev;
      return { ...prev, [id]: q };
    });
  }, []);

  const updateQuantity = useCallback((next: BasketMap) => {
    setBasket(next || {});
  }, []);

  const clearBasket = useCallback(() => setBasket({}), []);

  // stable context value
  const value: BasketContextValue = useMemo(
    () => ({
      basket,
      basketCount,
      addToBasket,
      removeFromBasket,
      updateQuantity,
      setItemQuantity,
      clearBasket,
    }),
    [
      basket,
      basketCount,
      addToBasket,
      removeFromBasket,
      updateQuantity,
      setItemQuantity,
      clearBasket,
    ]
  );

  return React.createElement(
    BasketContext.Provider,
    { value },
    children as any
  );
}

export function useBasket(): BasketContextValue {
  const ctx = useContext(BasketContext);
  if (!ctx) {
    throw new Error("useBasket must be used within <BasketProvider>");
  }
  return ctx;
}
