// Keep the worker deliberately cache-free: it enables installability without
// changing the freshness guarantees of checkout, inventory, or order data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
