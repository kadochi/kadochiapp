"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BasketMap = Record<string, number>;

export type BasketContextValue = {
  basket: BasketMap;
  basketCount: number;
  addToBasket: (id: string, qty?: number) => void;
  removeFromBasket: (id: string, qty?: number) => void;
  updateQuantity: (next: BasketMap) => void;
  setItemQuantity: (id: string, qty: number) => void;
  clearBasket: () => void;
};

const BasketContext = createContext<BasketContextValue | undefined>(undefined);
const STORAGE_KEY = "kadochi:basket:v1";

export function BasketProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<BasketMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BasketMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
    } catch {}
  }, [basket]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const next = e.newValue ? (JSON.parse(e.newValue) as BasketMap) : {};
          setBasket(next);
        } catch {}
      }
    };
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
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextQty };
    });

  const setItemQuantity = (id: string, qty: number) =>
    setBasket((prev) => {
      if (qty <= 0) {
        const { [id]: _, ...rest } = prev;
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

  return (
    <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
  );
}

export function useBasket(): BasketContextValue {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within <BasketProvider>");
  return ctx;
}
