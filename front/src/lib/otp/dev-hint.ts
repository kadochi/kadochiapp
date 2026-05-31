/** Client-visible dev OTP hint (must match server OTP_DEV_PHONE default). */
export const OTP_DEV_PHONE_HINT =
  process.env.NEXT_PUBLIC_OTP_DEV_PHONE || "09120000000";

export const OTP_DEV_CODE_HINT = "0000";

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}
