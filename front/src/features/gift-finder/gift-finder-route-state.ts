const giftFinderReturnScrollKey = "kadochi:gift-finder:return-scroll";

/** Session storage is optional so privacy settings can never block navigation. */
export function rememberGiftFinderReturnScroll() {
  try {
    window.sessionStorage.setItem(giftFinderReturnScrollKey, String(window.scrollY));
  } catch {
    // Next's native scroll restoration remains the fallback.
  }
}

export function readGiftFinderReturnScroll() {
  try {
    const storedValue = window.sessionStorage.getItem(giftFinderReturnScrollKey);
    if (storedValue === null) return undefined;
    const storedPosition = Number(storedValue);
    return Number.isFinite(storedPosition) ? storedPosition : undefined;
  } catch {
    return undefined;
  }
}

export function clearGiftFinderReturnScroll() {
  try {
    window.sessionStorage.removeItem(giftFinderReturnScrollKey);
  } catch {
    // Storage may be disabled; there is nothing else to clear.
  }
}
