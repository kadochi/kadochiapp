import { useCallback, useEffect, useRef, useState } from "react";
import { addItem, getCart, removeItem, updateQuantity } from "@/features/cart/services/cart";
import { useToast } from "@/components/ui/toaster";
import type { Cart } from "@/features/cart/types";

export type UseAddToCartOptions = { productId: number; min?: number; max?: number };

export type UseAddToCartResult = {
  quantity: number;
  isInCart: boolean;
  setQuantity: (quantity: number) => Promise<void>;
  add: () => Promise<void>;
  remove: () => Promise<void>;
  isPending: boolean;
};

/** Keeps the product action in sync with its persisted Woo cart item. */
export function useAddToCart({ productId, min = 1, max = 9 }: UseAddToCartOptions): UseAddToCartResult {
  const { toast } = useToast();
  const [item, setItem] = useState<{ key: string; quantity: number } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const syncRevision = useRef(0);

  const syncItem = useCallback((cart: Cart) => {
    const next = cart.items.find((cartItem) => cartItem.productId === productId);
    setItem(next ? { key: next.key, quantity: Math.max(min, Math.min(max, next.quantity)) } : null);
  }, [max, min, productId]);

  useEffect(() => {
    let cancelled = false;
    const revision = ++syncRevision.current;
    void getCart()
      .then((cart) => {
        if (!cancelled && revision === syncRevision.current) syncItem(cart);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [syncItem]);

  async function add() {
    if (isPending) return;
    const revision = ++syncRevision.current;
    setIsPending(true);
    try {
      const cart = await addItem({ productId, quantity: min });
      if (revision === syncRevision.current) syncItem(cart);
      toast({ tone: "success", title: "به سبد خرید اضافه شد" });
    } catch {
      toast({ tone: "error", title: "افزودن به سبد خرید ناموفق بود" });
    } finally {
      setIsPending(false);
    }
  }

  async function setQuantity(value: number) {
    if (!item || isPending) return;
    const revision = ++syncRevision.current;
    setIsPending(true);
    try {
      const cart = await updateQuantity(item.key, Math.max(min, Math.min(max, value)));
      if (revision === syncRevision.current) syncItem(cart);
    } catch {
      toast({ tone: "error", title: "تغییر تعداد ناموفق بود" });
    } finally {
      setIsPending(false);
    }
  }

  async function remove() {
    if (!item || isPending) return;
    const revision = ++syncRevision.current;
    setIsPending(true);
    try {
      await removeItem(item.key);
      if (revision === syncRevision.current) setItem(null);
    } catch {
      toast({ tone: "error", title: "حذف از سبد خرید ناموفق بود" });
    } finally {
      setIsPending(false);
    }
  }

  return { quantity: item?.quantity ?? min, isInCart: item !== null, setQuantity, add, remove, isPending };
}
