import { describe, expect, it, vi } from "vitest";

import {
  AuthRefreshCoordinator,
  authStorageKey,
  publishAuthChange,
  statusAfterRefreshFailure,
  subscribeToAuthChanges,
} from "./auth-coordination";
import type { Customer } from "./types";

const confirmedCustomer: Customer = {
  id: 1,
  email: "customer@example.com",
  displayName: "Customer",
  firstName: "",
  lastName: "",
  avatarSrc: null,
  birthDate: null,
  gender: null,
  phone: "+989121234567",
  roles: ["customer"],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe("AuthRefreshCoordinator", () => {
  it("deduplicates concurrent refresh calls", async () => {
    const coordinator = new AuthRefreshCoordinator<string>();
    const request = deferred<string>();
    const load = vi.fn(() => request.promise);
    const committed: string[] = [];

    const first = coordinator.run(load, (value) => committed.push(value), vi.fn());
    const second = coordinator.run(load, (value) => committed.push(value), vi.fn());
    request.resolve("customer");

    expect(second).toBe(first);
    await expect(Promise.all([first, second])).resolves.toEqual(["customer", "customer"]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(committed).toEqual(["customer"]);
  });

  it("does not commit a refresh superseded by login or logout", async () => {
    const coordinator = new AuthRefreshCoordinator<string>();
    const staleRequest = deferred<string>();
    const staleCommit = vi.fn();
    const staleFailure = vi.fn();
    const stale = coordinator.run(() => staleRequest.promise, staleCommit, staleFailure);

    coordinator.invalidate();
    staleRequest.resolve("stale-customer");

    await expect(stale).resolves.toBe("stale-customer");
    expect(staleCommit).not.toHaveBeenCalled();
    expect(staleFailure).not.toHaveBeenCalled();
  });

  it("allows a fresh refresh immediately after invalidation", async () => {
    const coordinator = new AuthRefreshCoordinator<string>();
    const staleRequest = deferred<string>();
    const stale = coordinator.run(() => staleRequest.promise, vi.fn(), vi.fn());
    coordinator.invalidate();

    const freshCommit = vi.fn();
    const fresh = coordinator.run(async () => "fresh-customer", freshCommit, vi.fn());
    staleRequest.resolve("stale-customer");

    await expect(Promise.all([stale, fresh])).resolves.toEqual(["stale-customer", "fresh-customer"]);
    expect(freshCommit).toHaveBeenCalledWith("fresh-customer");
  });

  it("does not surface an error from a superseded refresh", async () => {
    const coordinator = new AuthRefreshCoordinator<string>();
    const staleRequest = deferred<string>();
    const staleFailure = vi.fn();
    const stale = coordinator.run(() => staleRequest.promise, vi.fn(), staleFailure);

    coordinator.invalidate();
    staleRequest.reject(new Error("stale failure"));

    await expect(stale).rejects.toThrow("stale failure");
    expect(staleFailure).not.toHaveBeenCalled();
  });
});

describe("auth refresh failure status", () => {
  it("keeps authenticated status only for a previously confirmed customer", () => {
    expect(statusAfterRefreshFailure(confirmedCustomer)).toBe("authenticated");
    expect(statusAfterRefreshFailure(null)).toBe("error");
  });
});

type FakeStorageListener = (event: StorageEvent) => void;

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly messages: unknown[] = [];
  closed = false;

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  postMessage(value: unknown) {
    this.messages.push(value);
  }
}

function syncTarget(withBroadcastChannel: boolean) {
  const listeners = new Set<FakeStorageListener>();
  const storageWrites: Array<[string, string]> = [];
  return {
    target: {
      ...(withBroadcastChannel ? { BroadcastChannel: FakeBroadcastChannel } : {}),
      localStorage: { setItem: (key: string, value: string) => storageWrites.push([key, value]) },
      addEventListener: (_type: string, listener: FakeStorageListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: FakeStorageListener) => listeners.delete(listener),
    } as never,
    listeners,
    storageWrites,
  };
}

describe("auth cross-tab transport", () => {
  it("uses only BroadcastChannel when it is available", () => {
    FakeBroadcastChannel.instances = [];
    const { listeners, storageWrites, target } = syncTarget(true);
    const onChange = vi.fn();

    publishAuthChange(target, "sender-a");
    const unsubscribe = subscribeToAuthChanges(target, "sender-b", onChange);

    expect(storageWrites).toEqual([]);
    expect(listeners.size).toBe(0);
    expect(FakeBroadcastChannel.instances).toHaveLength(2);
    expect(FakeBroadcastChannel.instances[0].messages).toEqual([
      expect.objectContaining({ type: "changed", sender: "sender-a" }),
    ]);
    FakeBroadcastChannel.instances[1].onmessage?.({ data: { type: "changed", sender: "sender-a" } } as MessageEvent);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(FakeBroadcastChannel.instances[1].closed).toBe(true);
  });

  it("uses localStorage only as a fallback", () => {
    const { listeners, storageWrites, target } = syncTarget(false);
    const onChange = vi.fn();

    publishAuthChange(target, "sender-a");
    publishAuthChange(target, "sender-a");
    const unsubscribe = subscribeToAuthChanges(target, "sender-b", onChange);

    expect(storageWrites).toHaveLength(2);
    expect(storageWrites[0][0]).toBe(authStorageKey);
    expect(storageWrites[1][1]).not.toBe(storageWrites[0][1]);
    expect(listeners.size).toBe(1);
    const [listener] = listeners;
    listener({ key: authStorageKey, newValue: storageWrites[1][1] } as StorageEvent);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(listeners.size).toBe(0);
  });
});
