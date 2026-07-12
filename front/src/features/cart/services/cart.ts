import { bffJson } from "@/lib/http/browser";
import { cartSchema, addItemSchema, selectShippingRateSchema, updateCustomerSchema, updateQuantitySchema } from "../schema/cart";
import type { AddItemInput, CustomerAddresses, ShippingRateInput } from "../types";

export const getCart = () => bffJson("/api/cart", { method: "GET" }, (value) => cartSchema.parse(value));
export const addItem = (input: AddItemInput) => bffJson("/api/cart/items", { method: "POST", body: JSON.stringify(addItemSchema.parse(input)) }, (value) => cartSchema.parse(value));
export const updateQuantity = (itemKey: string, quantity: number) => bffJson(`/api/cart/items/${encodeURIComponent(itemKey)}`, { method: "PATCH", body: JSON.stringify(updateQuantitySchema.parse({ quantity })) }, (value) => cartSchema.parse(value));
export const removeItem = (itemKey: string) => bffJson(`/api/cart/items/${encodeURIComponent(itemKey)}`, { method: "DELETE" }, (value) => cartSchema.parse(value));
export const updateCustomer = (addresses: CustomerAddresses) => bffJson("/api/cart/customer", { method: "PATCH", body: JSON.stringify(updateCustomerSchema.parse(addresses)) }, (value) => cartSchema.parse(value));
export const selectShippingRate = (input: ShippingRateInput) => bffJson("/api/cart/shipping-rate", { method: "POST", body: JSON.stringify(selectShippingRateSchema.parse(input)) }, (value) => cartSchema.parse(value));
