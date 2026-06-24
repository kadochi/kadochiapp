export {
  SessionProvider,
  useSession,
  useOptionalSession,
} from "./context/session-context";

export { useSessionQuery, useOtpStart, useOtpVerify, useLogout } from "./hooks/useAuth";

export { apiStartOtp, apiVerifyOtp, apiLogout, apiMe } from "./services/otp";

export { OTP_DEV_PHONE_HINT, OTP_DEV_CODE_HINT, isLocalDevHost } from "./services/otp";

export { sessionSchema, jwtPayloadSchema, otpStartResponseSchema, otpVerifyResponseSchema } from "./schema";

export type { Session, AuthState, OtpStartResponse, OtpVerifyResponse } from "./types";
