import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { Router, type RequestHandler } from 'express';
import {
  type createSessions,
  requireCsrf,
  sessionUserId,
} from '../config/session.ts';
import { ApiError } from '../middleware/errors.ts';
import { publicUser, type createUserModel } from '../models/User.ts';
import {
  loginSchema,
  parseBody,
  profileSchema,
  registerSchema,
} from '../validators/auth.ts';
import type { createRateLimits } from '../middleware/rateLimits.ts';

// OWASP Argon2id baseline: 19 MiB, two passes, one lane.
const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function createAccountRoutes(
  User: ReturnType<typeof createUserModel>,
  sessions: Awaited<ReturnType<typeof createSessions>>,
  limits: ReturnType<typeof createRateLimits>,
  scanRoutes: ReturnType<typeof Router>,
) {
  const router = Router();
  const dummyHash = await argon2.hash(randomBytes(32), hashOptions);

  const requireAuth: RequestHandler = async (request, response, next) => {
    const id = sessionUserId(request);
    const user = id ? await User.findById(id) : null;
    if (!user)
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    response.locals.user = user;
    next();
  };

  router.use('/scans', requireAuth, scanRoutes);

  router.get('/auth/csrf', async (request, response) => {
    const csrfToken = await sessions.bootstrap(request);
    response.json({ success: true, data: { csrfToken } });
  });

  router.post(
    '/auth/register',
    limits.register,
    requireCsrf,
    async (request, response) => {
      const { fullName, email, password } = parseBody(
        registerSchema,
        request.body,
      );
      const passwordHash = await argon2.hash(password, hashOptions);
      const user = await User.create({ fullName, email, passwordHash }).catch(
        (error: unknown) => {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
          ) {
            console.info('account.registration_conflict');
            throw new ApiError(
              409,
              'ACCOUNT_CONFLICT',
              'An account could not be created with those details. Try signing in.',
            );
          }
          throw error;
        },
      );
      await sessions.start(request, user._id.toString());
      console.info('account.registered');
      response
        .status(201)
        .json({ success: true, data: { user: publicUser(user) } });
    },
  );

  router.post(
    '/auth/login',
    limits.login,
    requireCsrf,
    (request, response, next) => {
      response.locals.credentials = parseBody(loginSchema, request.body);
      next();
    },
    limits.account,
    async (request, response) => {
      const { email, password } = response.locals.credentials as ReturnType<
        typeof loginSchema.parse
      >;
      const user = await User.findOne({ email }).select('+passwordHash');
      const valid = await argon2.verify(
        user?.passwordHash ?? dummyHash,
        password,
      );
      if (!user || !valid) {
        console.info('account.invalid_credentials');
        throw new ApiError(
          401,
          'INVALID_CREDENTIALS',
          'Invalid email or password.',
        );
      }
      await sessions.start(request, user._id.toString());
      console.info('account.signed_in');
      response.json({ success: true, data: { user: publicUser(user) } });
    },
  );

  router.post('/auth/logout', requireCsrf, async (request, response) => {
    await sessions.end(request, response);
    console.info('account.signed_out');
    response.json({ success: true, data: {} });
  });

  router.get('/auth/me', requireAuth, (_request, response) => {
    response.json({
      success: true,
      data: { user: publicUser(response.locals.user) },
    });
  });

  router.patch(
    '/users/me',
    requireAuth,
    requireCsrf,
    async (request, response) => {
      const { fullName } = parseBody(profileSchema, request.body);
      const user = await User.findByIdAndUpdate(
        response.locals.user._id,
        { $set: { fullName } },
        { returnDocument: 'after', runValidators: true },
      );
      if (!user)
        throw new ApiError(
          401,
          'UNAUTHENTICATED',
          'Please sign in to continue.',
        );
      console.info('account.profile_updated');
      response.json({ success: true, data: { user: publicUser(user) } });
    },
  );

  return router;
}
