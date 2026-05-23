export default function TopBanner() {
  return (
    <div
      style={{
        height: "48px",
        background: "var(--primary-primary)",
        color: "var(--primary-on-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "14px",
        fontWeight: 400,
        width: "100%",
        direction: "rtl",
      }}
    >
      <span>روز مادر مبارک!</span>

      <a
        href="/products?tag=motherday"
        style={{
          textDecoration: "underline",
          color: "var(--primary-on-primary)",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        خرید کادو
      </a>
    </div>
  );
}
