export const queryKeys = {
  auth: {
    session: () => ["auth", "session"] as const,
  },
  catalog: {
    products: (filters: Record<string, string | number | boolean | undefined>) =>
      ["products", filters] as const,
    product: (id: string | number) => ["product", id] as const,
  },
  occasions: {
    list: (userId?: number | null) => ["occasions", "carousel", userId] as const,
  },
}
