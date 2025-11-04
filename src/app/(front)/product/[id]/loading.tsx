export default function Loading() {
  const shimmer =
    "linear-gradient(90deg, #f2f2f5 25%, #e8e8ee 37%, #f2f2f5 63%)";
  const shimmerStyle = {
    background: shimmer,
    backgroundSize: "400% 100%",
    animation: "pdp-shimmer 1.2s ease-in-out infinite",
  } as const;

  return (
    <main dir="rtl" style={{ paddingTop: 0 }}>
      <section
        style={{
          background: "var(--surface-background, #fff)",
          overflow: "hidden",
          paddingBottom: 24,
        }}
      >
        {/* ===== ImageGallery Skeleton ===== */}
        <div style={{ width: "100%", marginBottom: 12 }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              aria-hidden
              style={{
                ...shimmerStyle,
                width: "100%",
                maxWidth: 400,
                aspectRatio: "1 / 1",
                maxHeight: 400,
              }}
            />
          </div>
        </div>

        {/* Thumbnails Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "12px 0 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-m, 12px)",
                  ...shimmerStyle,
                }}
              />
            ))}
          </div>
        </div>

        {/* ===== ProductInfo Skeleton ===== */}
        <div
          style={{
            paddingInline: 16,
            paddingTop: 24,
            paddingBottom: 24,
            textAlign: "center",
            display: "grid",
            gap: 12,
          }}
        >
          {/* title */}
          <div
            style={{
              ...shimmerStyle,
              height: 24,
              width: "200px",
              marginInline: "auto",
              borderRadius: 24,
            }}
          />
          {/* price */}
          <div
            style={{
              ...shimmerStyle,
              height: 20,
              width: "128px",
              marginInline: "auto",
              borderRadius: 24,
            }}
          />
          {/* meta rows */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 16,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...shimmerStyle,
                  height: 24,
                  width: 80,
                  borderRadius: 24,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Spacer so fixed bar doesn't overlap content ===== */}
      <div style={{ height: 80 }} />

      {/* ===== ActionBar Skeleton (fixed) ===== */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          zIndex: 200,
          background: "var(--surface-background, #fff)",
          padding: "16px 16px 24px",
          borderTop: "1px solid var(--border-border-low-emphasis, #eee)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* price line */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                ...shimmerStyle,
                height: 24,
                width: "120px",
                borderRadius: 24,
              }}
            />
          </div>

          {/* button block */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                ...shimmerStyle,
                height: 56,
                borderRadius: 40,
              }}
            />
          </div>
        </div>
      </div>

      {/* shimmer animation */}
      <style>{`
        @keyframes pdp-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0% 0; }
        }
      `}</style>
    </main>
  );
}
