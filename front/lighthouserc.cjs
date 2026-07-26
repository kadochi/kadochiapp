const baseUrl = new URL(
  process.env.AUDIT_BASE_URL || "http://localhost:3000",
);
const productPath = process.env.AUDIT_PRODUCT_PATH || "/product/1114";
const profile = process.env.AUDIT_PRESET === "desktop" ? "desktop" : "mobile";
const isLocal =
  baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1";
const urls = ["/", "/products", productPath, "/magazine"].map((pathname) =>
  new URL(pathname, baseUrl).toString(),
);

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: urls,
      settings: profile === "desktop" ? { preset: "desktop" } : {},
      ...(isLocal
        ? {
            startServerCommand: `npm run start -- -p ${baseUrl.port || "3000"}`,
            startServerReadyPattern: "Ready in|Local:",
            startServerReadyTimeout: 60_000,
          }
        : {}),
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "first-contentful-paint": ["error", { maxNumericValue: 1_800 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2_500 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "errors-in-console": "error",
        "heading-order": "error",
        "http-status-code": "error",
        "meta-description": "error",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: `.lighthouseci/${profile}`,
    },
  },
};
