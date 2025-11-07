"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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

/**
 * Provider for basket state.
 * Note: this file intentionally uses `.ts` (no JSX).
 */
export function BasketProvider({ children }: { children: ReactNode }) {
  // lazy init from localStorage (client only)
  const [basket, setBasket] = useState<BasketMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BasketMap) : {};
    } catch {
      return {};
    }
  });

  // persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
    } catch {}
  }, [basket]);

  // sync across tabs/windows
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        try {
          const next = e.newValue ? (JSON.parse(e.newValue) as BasketMap) : {};
          setBasket(next);
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const basketCount = useMemo(
    () => Object.values(basket).reduce((sum, n) => sum + n, 0),
    [basket]
  );

  const addToBasket = (id: string, qty = 1) =>
    setBasket((prev) => ({ ...prev, [id]: (prev[id] || 0) + qty }));

  const removeFromBasket = (id: string, qty = 1) =>
    setBasket((prev) => {
      const cur = prev[id] || 0;
      const nextQty = cur - qty;
      if (nextQty <= 0) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextQty };
    });

  const setItemQuantity = (id: string, qty: number) =>
    setBasket((prev) => {
      if (qty <= 0) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: qty };
    });

  const updateQuantity = (next: BasketMap) => setBasket(next);
  const clearBasket = () => setBasket({});

  const value: BasketContextValue = {
    basket,
    basketCount,
    addToBasket,
    removeFromBasket,
    updateQuantity,
    setItemQuantity,
    clearBasket,
  };

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
