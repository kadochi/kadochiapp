import type { AuthStatus, Customer } from "./types";

export const authChannel = "kadochi-auth";
export const authStorageKey = "kadochi-auth-change";

export type AuthChange = { type: "changed"; sender: string; revision?: string };

let authChangeSequence = 0;

type AuthSyncTarget = Pick<Window, "addEventListener" | "removeEventListener" | "localStorage"> & {
  BroadcastChannel?: typeof BroadcastChannel;
};

function isAuthChange(value: unknown): value is AuthChange {
  return typeof value === "object" && value !== null
    && (value as { type?: unknown }).type === "changed"
    && typeof (value as { sender?: unknown }).sender === "string";
}

/** Publishes through one transport so another tab never handles one change twice. */
export function publishAuthChange(target: AuthSyncTarget, sender: string): void {
  // localStorage does not emit a storage event when the serialized value is
  // unchanged, so every fallback publication needs a distinct revision.
  authChangeSequence += 1;
  const change: AuthChange = {
    type: "changed",
    sender,
    revision: `${Date.now().toString(36)}-${authChangeSequence.toString(36)}`,
  };
  const Broadcast = target.BroadcastChannel;

  if (typeof Broadcast === "function") {
    try {
      const channel = new Broadcast(authChannel);
      channel.postMessage(change);
      channel.close();
      return;
    } catch {
      // Treat an unusable BroadcastChannel implementation as unavailable.
    }
  }

  try {
    target.localStorage.setItem(authStorageKey, JSON.stringify(change));
  } catch {
    // Private browsing can disable localStorage; cross-tab sync is best effort.
  }
}

/** Subscribes to the same single transport selected by publishAuthChange. */
export function subscribeToAuthChanges(
  target: AuthSyncTarget,
  sender: string,
  onChange: () => void,
): () => void {
  const refreshIfChanged = (value: unknown) => {
    if (isAuthChange(value) && value.sender !== sender) onChange();
  };
  const Broadcast = target.BroadcastChannel;

  if (typeof Broadcast === "function") {
    try {
      const channel = new Broadcast(authChannel);
      channel.onmessage = (event: MessageEvent<unknown>) => refreshIfChanged(event.data);
      return () => channel.close();
    } catch {
      // Fall through to storage when channel construction is unavailable.
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== authStorageKey || !event.newValue) return;
    try {
      refreshIfChanged(JSON.parse(event.newValue));
    } catch {
      // Ignore unrelated or corrupted local storage values.
    }
  };
  target.addEventListener("storage", handleStorage);
  return () => target.removeEventListener("storage", handleStorage);
}

/** A cookie hint is not authentication; only retained customer data is confirmed. */
export function statusAfterRefreshFailure(customer: Customer | null): AuthStatus {
  return customer ? "authenticated" : "error";
}

/** Deduplicates refreshes and prevents superseded requests from committing state. */
export class AuthRefreshCoordinator<T> {
  private generation = 0;
  private inFlight: Promise<T> | null = null;

  run(
    load: () => Promise<T>,
    onSuccess: (value: T) => void,
    onFailure: (error: unknown) => void,
  ): Promise<T> {
    if (this.inFlight) return this.inFlight;

    const generation = ++this.generation;
    let request: Promise<T>;
    try {
      request = load();
    } catch (error) {
      request = Promise.reject(error);
    }

    const pending = request
      .then((value) => {
        if (generation === this.generation) onSuccess(value);
        return value;
      })
      .catch((error: unknown) => {
        if (generation === this.generation) onFailure(error);
        throw error;
      })
      .finally(() => {
        if (this.inFlight === pending) this.inFlight = null;
      });
    this.inFlight = pending;
    return pending;
  }

  invalidate(): void {
    this.generation += 1;
    this.inFlight = null;
  }
}
