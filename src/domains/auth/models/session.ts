// src/domains/auth/models/session.ts
export type Session = {
  userId: number | null;
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};
