import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address.'));
const password = z
  .string()
  .max(256, 'Use no more than 128 characters.')
  .refine(
    (value) => [...value].length <= 128,
    'Use no more than 128 characters.',
  )
  .refine((value) => !/\p{Surrogate}/u.test(value), 'Enter a valid password.');

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(100, 'Use no more than 100 characters.'),
});

export const loginSchema = z.object({
  email,
  password: password.refine(
    (value) => value.length > 0,
    'Enter your password.',
  ),
  rememberEmail: z.boolean(),
});

export const signupSchema = profileSchema
  .extend({
    email,
    password: password.refine(
      (value) => [...value].length >= 12,
      'Use at least 12 characters.',
    ),
    confirmPassword: z.string().max(256, 'Use no more than 128 characters.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  });
