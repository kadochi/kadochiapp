export const queryKeys = {
  session: () => ["session"] as const,

  products: {
    list: (params: Record<string, string | number | boolean | undefined>) =>
      ["products", "list", params] as const,
    byIds: (ids: number[]) => ["products", "byIds", ids] as const,
    detail: (id: number) => ["products", id] as const,
  },

  categories: () => ["categories"] as const,

  occasions: (userId: number | null) => ["occasions", userId] as const,

  footerCategories: () => ["footer", "categories"] as const,
} as const;
