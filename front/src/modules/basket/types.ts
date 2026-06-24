import { z } from "zod";

export const basketItemSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().int().min(0),
});

export type BasketItem = z.infer<typeof basketItemSchema>;

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
