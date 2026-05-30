import "server-only";
import { getRedis } from "@/lib/redis";

const OTP_KEY_PREFIX = "kadochi:otp:";
const RATE_PHONE_PREFIX = "kadochi:otp:rate:phone:";
const RATE_IP_PREFIX = "kadochi:otp:rate:ip:";
const RATE_WINDOW_SEC = 60 * 60;

function otpKey(phone: string) {
  return `${OTP_KEY_PREFIX}${phone}`;
}

export async function setOtpCode(
  phone: string,
  code: string,
  ttlSec: number,
): Promise<void> {
  const redis = getRedis();
  await redis.set(otpKey(phone), code, "EX", ttlSec);
}

export async function getOtpCode(phone: string): Promise<string | null> {
  const redis = getRedis();
  const code = await redis.get(otpKey(phone));
  return code || null;
}

export async function deleteOtpCode(phone: string): Promise<void> {
  const redis = getRedis();
  await redis.del(otpKey(phone));
}

async function incrementRateLimit(
  key: string,
  limit: number,
): Promise<boolean> {
  const redis = getRedis();
  const hits = await redis.incr(key);
  if (hits === 1) {
    await redis.expire(key, RATE_WINDOW_SEC);
  }
  return hits <= limit;
}

export async function checkOtpRateLimit(
  phone: string,
  ip: string,
  limitPerHour: number,
): Promise<boolean> {
  const [phoneOk, ipOk] = await Promise.all([
    incrementRateLimit(`${RATE_PHONE_PREFIX}${phone}`, limitPerHour),
    incrementRateLimit(`${RATE_IP_PREFIX}${ip}`, limitPerHour),
  ]);
  return phoneOk && ipOk;
}
