import { createHash } from 'node:crypto';
import { rateLimit, type Options } from 'express-rate-limit';
import { fail } from './errors.ts';

const options = {
  windowMs: 15 * 60_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    console.warn('account.rate_limited');
    fail(
      response,
      429,
      'RATE_LIMITED',
      'Too many requests. Please wait a few minutes and try again.',
    );
  },
} satisfies Partial<Options>;

export function createRateLimits() {
  return {
    all: rateLimit({ ...options, limit: 120, identifier: 'accounts' }),
    register: rateLimit({ ...options, limit: 8, identifier: 'signup' }),
    login: rateLimit({ ...options, limit: 15, identifier: 'signin-ip' }),
    account: rateLimit({
      ...options,
      limit: 30,
      identifier: 'signin-account',
      skipSuccessfulRequests: true,
      keyGenerator: (_request, response) =>
        createHash('sha256')
          .update(response.locals.credentials.email)
          .digest('hex'),
    }),
  };
}
