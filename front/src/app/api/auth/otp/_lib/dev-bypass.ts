/** Fixed OTP code for the local dev phone (local testing only). */
export const OTP_DEV_BYPASS_CODE = "0000";

/** Default fake phone for local OTP bypass. Override with OTP_DEV_PHONE. */
export const OTP_DEV_PHONE_DEFAULT = "09120000000";

const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");

/** Normalized dev bypass phone from env, or the default fake number. */
export function getOtpDevPhone(): string {
  return onlyDigits(process.env.OTP_DEV_PHONE || OTP_DEV_PHONE_DEFAULT);
}

/** True when SMS can be skipped and the dev phone + 0000 are accepted. */
export function isOtpDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.OTP_DEV_BYPASS === "1"
  );
}

/** True when bypass is on and the submitted phone is the configured dev phone. */
export function isDevBypassPhone(phone: string): boolean {
  if (!isOtpDevBypassEnabled()) return false;
  return onlyDigits(phone) === getOtpDevPhone();
}

/** True when this phone/code pair should skip SMS and Redis OTP checks. */
export function isDevBypassLogin(phone: string, code: string): boolean {
  return (
    isDevBypassPhone(phone) && onlyDigits(code) === OTP_DEV_BYPASS_CODE
  );
}

/** Block trivial codes in production; allow 0000 only for the dev phone locally. */
export function isBlockedTestCode(code: string, phone?: string): boolean {
  const blocked = new Set(["0000", "1111", "1234", "2222", "9999"]);
  if (
    phone &&
    isDevBypassLogin(phone, onlyDigits(code))
  ) {
    return false;
  }
  return blocked.has(onlyDigits(code));
}
