import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/env", () => ({
  env: { WORDPRESS_INTERNAL_URL: "http://wordpress" },
}));

import { GET } from "./route";

describe("GET /api/images", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns a cached, width-limited AVIF variant for a WordPress upload", async () => {
    const source = await sharp({
      create: { background: { b: 128, g: 64, r: 32, alpha: 1 }, channels: 4, height: 900, width: 1_200 },
    }).png().toBuffer();
    const fetchMock = vi.fn().mockResolvedValue(new Response(source, {
      headers: { "content-type": "image/png" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.png&w=640&q=75",
      { headers: { accept: "image/avif,image/webp,*/*" } },
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/avif");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(await sharp(Buffer.from(await response.arrayBuffer())).metadata()).toMatchObject({ format: "heif", width: 640 });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/wp-content/uploads/2026/08/cover.png", "http://wordpress"),
      {
        headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
        next: { revalidate: 3_600 },
      },
    );
  });

  it("returns a deadline response without adding a signal to the cacheable fetch", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: URL, init?: RequestInit) => {
      void url;
      void init;
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.png&w=640&q=75",
    ));
    await vi.advanceTimersByTimeAsync(8_000);
    const response = await pending;

    expect(response.status).toBe(504);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init).not.toHaveProperty("signal");
    expect(init).toEqual({
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      next: { revalidate: 3_600 },
    });
  });

  it("bounds the wait for a stalled WordPress image body", async () => {
    vi.useFakeTimers();
    const read = vi.fn(() => new Promise<ReadableStreamReadResult<Uint8Array>>(() => undefined));
    const releaseLock = vi.fn();
    const upstream = {
      body: { getReader: () => ({ cancel: vi.fn(), read, releaseLock }) },
      headers: new Headers({ "content-type": "image/png" }),
      ok: true,
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));

    const pending = GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.png&w=640&q=75",
    ));
    await vi.advanceTimersByTimeAsync(8_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect(read).toHaveBeenCalledOnce();
  });

  it("rejects a declared oversized source before reading or passing it to Sharp", async () => {
    const getReader = vi.fn();
    const upstream = {
      body: { getReader },
      headers: new Headers({
        "content-length": String(20 * 1024 * 1024 + 1),
        "content-type": "image/jpeg",
      }),
      ok: true,
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));

    const response = await GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.jpg&w=640&q=75",
    ));

    expect(response.status).toBe(413);
    expect(getReader).not.toHaveBeenCalled();
  });

  it("rejects image variants outside the configured responsive set", async () => {
    const response = await GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.png&w=500&q=75",
    ));

    expect(response.status).toBe(400);
  });
});
