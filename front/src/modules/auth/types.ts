export type Session = {
  userId: number | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  roles?: string[];
};

export type AuthState = {
  session: Session | null;
  isLoading: boolean;
};

export type OtpStartResponse = {
  ok: boolean;
  ttlSec?: number;
  requestId?: string;
};

export type OtpVerifyResponse = {
  ok: boolean;
  userId?: number;
  requestId?: string;
};
