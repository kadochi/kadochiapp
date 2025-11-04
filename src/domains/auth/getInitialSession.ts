// server-only: no network hop
import "server-only";
import { getSessionFromCookies, type Session } from "@/lib/auth/session";

export default async function getInitialSession(): Promise<Session | null> {
  const s = await getSessionFromCookies();
  return s.userId ? s : null;
}
