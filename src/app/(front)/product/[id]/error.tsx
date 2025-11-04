"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <h2>خطا در بارگذاری محصول</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      <button onClick={() => reset()} style={{ marginTop: 8 }}>
        تلاش مجدد
      </button>
    </div>
  );
}
