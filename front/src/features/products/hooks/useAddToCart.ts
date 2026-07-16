import { useState } from "react";
import { addItem } from "@/features/cart/services/cart";
import { useToast } from "@/components/ui/toaster";

export type UseAddToCartOptions = { productId: number; min?: number; max?: number };

export type UseAddToCartResult = {
  quantity: number;
  setQuantity: (quantity: number) => void;
  add: () => Promise<void>;
  isPending: boolean;
};

/** Manages a local quantity stepper and submits it to the cart with toast feedback. */
export function useAddToCart({ productId, min = 1, max = 9 }: UseAddToCartOptions): UseAddToCartResult {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(min);
  const [isPending, setIsPending] = useState(false);

  async function add() {
    if (isPending) return;
    setIsPending(true);
    try {
      await addItem({ productId, quantity });
      toast({ tone: "success", title: "به سبد خرید اضافه شد" });
    } catch {
      toast({ tone: "error", title: "افزودن به سبد خرید ناموفق بود" });
    } finally {
      setIsPending(false);
    }
  }

  return { quantity, setQuantity: (value) => setQuantity(Math.max(min, Math.min(max, value))), add, isPending };
}
