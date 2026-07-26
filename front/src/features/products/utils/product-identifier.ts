/**
 * Public product and category URLs accept either a legacy WooCommerce ID or a
 * current human-readable slug. Numeric identifiers deliberately resolve as
 * IDs because WordPress IDs are the established legacy URL contract.
 */
export function isNumericIdIdentifier(identifier: string): boolean {
  if (!/^\d+$/.test(identifier)) return false;

  const id = Number(identifier);
  return Number.isSafeInteger(id) && id > 0;
}

/** Kept as a product-specific alias for existing service callers. */
export const isProductIdIdentifier = isNumericIdIdentifier;
