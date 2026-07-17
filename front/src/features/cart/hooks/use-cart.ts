"use client";

import { useCallback, useState } from "react";

import { removeItem, updateQuantity } from "../services/cart";
import type { Cart } from "../types";

export function useCart(initialCart: Cart | null) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [pendingItems, setPendingItems] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const mutateItem = useCallback(async (itemKey: string, mutation: () => Promise<Cart>) => {
    if (pendingItems.has(itemKey)) return;
    setPendingItems((items) => new Set(items).add(itemKey));
    setError(null);
    try {
      setCart(await mutation());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تغییرات سبد خرید ذخیره نشد.");
    } finally {
      setPendingItems((items) => {
        const next = new Set(items);
        next.delete(itemKey);
        return next;
      });
    }
  }, [pendingItems]);

  const changeQuantity = useCallback((itemKey: string, quantity: number) => mutateItem(itemKey, () => updateQuantity(itemKey, quantity)), [mutateItem]);
  const remove = useCallback((itemKey: string) => mutateItem(itemKey, () => removeItem(itemKey)), [mutateItem]);

  return {
    cart,
    error,
    pendingItems,
    changeQuantity,
    remove,
    dismissError: () => setError(null),
  };
}
