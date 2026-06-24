import { z } from "zod";

export const sessionSchema = z.object({
  userId: z.number().nullable(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
});

export const jwtPayloadSchema = z.object({
  uid: z.number().optional(),
  userId: z.number().optional(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
});

export const otpStartResponseSchema = z.object({
  ok: z.boolean(),
  ttlSec: z.number().optional(),
  requestId: z.string().optional(),
});

export const otpVerifyResponseSchema = z.object({
  ok: z.boolean(),
  userId: z.number().optional(),
  requestId: z.string().optional(),
});
