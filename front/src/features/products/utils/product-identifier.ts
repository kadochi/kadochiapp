/**
 * Product detail URLs accept either the legacy WooCommerce ID or the current
 * human-readable slug. Numeric identifiers deliberately resolve as IDs: a
 * numeric slug would otherwise be ambiguous and WordPress product IDs are the
 * established public contract.
 */
export function isProductIdIdentifier(identifier: string): boolean {
  if (!/^\d+$/.test(identifier)) return false;

  const id = Number(identifier);
  return Number.isSafeInteger(id) && id > 0;
}
