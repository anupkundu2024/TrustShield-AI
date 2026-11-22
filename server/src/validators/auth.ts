import { z } from 'zod';
import { ApiError } from '../middleware/errors.ts';

const fullName = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z
  .string()
  .max(256)
  .refine((value) => [...value].length <= 128)
  .refine((value) => !/\p{Surrogate}/u.test(value));

export const loginSchema = z.strictObject({
  email,
  password: password.refine((value) => value.length > 0),
});
export const registerSchema = z.strictObject({
  fullName,
  email,
  password: password.refine((value) => [...value].length >= 12),
});
export const profileSchema = z.strictObject({ fullName });

export function parseBody<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check the submitted fields and try again.',
    );
  }
  return result.data;
}
