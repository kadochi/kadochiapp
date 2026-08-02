import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/env", () => ({
  env: { WORDPRESS_INTERNAL_URL: "http://wordpress" },
}));

import { GET } from "./route";

describe("GET /api/images", () => {
  afterEach(() => vi.unstubAllGlobals());

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
      expect.any(Object),
    );
  });

  it("rejects image variants outside the configured responsive set", async () => {
    const response = await GET(new Request(
      "https://kadochi.com/api/images?src=http%3A%2F%2Flocalhost%3A8080%2Fwp-content%2Fuploads%2F2026%2F08%2Fcover.png&w=500&q=75",
    ));

    expect(response.status).toBe(400);
  });
});
