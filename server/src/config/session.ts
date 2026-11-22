import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import type { Connection } from 'mongoose';
import { ApiError, databaseUnavailable } from '../middleware/errors.ts';
import type { ServerConfig } from './env.ts';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    signedInUntil?: number;
    csrfToken?: string;
  }
}

const day = 86_400_000;
const tokenPattern = /^[a-f0-9]{64}$/;

function token() {
  return randomBytes(32).toString('hex');
}

function persist(operation: (done: (error?: unknown) => void) => void) {
  return new Promise<void>((resolve, reject) => {
    operation((error) => {
      if (error) {
        console.warn('account.session_operation_failed');
        reject(databaseUnavailable());
      } else resolve();
    });
  });
}

export async function createSessions(
  config: ServerConfig,
  connection: Connection,
) {
  const secure = config.NODE_ENV === 'production';
  const name = secure ? '__Host-trustshield.sid' : 'trustshield.sid';
  const cookie: CookieOptions = {
    path: '/',
    secure,
    httpOnly: true,
    sameSite: 'lax',
  };
  const collectionName = 'sessions';
  if (!connection.db) throw databaseUnavailable();
  await connection.db
    .collection(collectionName)
    .createIndex({ expires: 1 }, { expireAfterSeconds: 0 });

  const store = MongoStore.create({
    client: connection.getClient(),
    dbName: connection.name,
    collectionName,
    autoRemove: 'disabled',
    ttl: day / 1000,
    touchAfter: (7 * day) / 1000,
    transformId: (id) => createHash('sha256').update(id).digest('hex'),
  });
  const middleware = session({
    name,
    secret: config.SESSION_SECRET,
    store,
    cookie: { ...cookie, maxAge: day },
    resave: false,
    saveUninitialized: false,
    rolling: false,
  });

  const loadSession: RequestHandler = (request, response, next) => {
    middleware(request, response, (error?: unknown) => {
      if (error) {
        console.warn('account.session_load_failed');
        next(databaseUnavailable());
      } else next();
    });
  };

  function end(request: Request, response: Response) {
    return persist((done) => request.session.destroy(done)).then(() => {
      response.clearCookie(name, cookie);
    });
  }

  async function save(request: Request) {
    try {
      await persist((done) => request.session.save(done));
    } catch (error) {
      // Suppress sending a cookie for a session the store could not confirm.
      Reflect.deleteProperty(request, 'session');
      throw error;
    }
  }

  async function start(request: Request, userId: string) {
    await persist((done) => request.session.regenerate(done));
    request.session.userId = userId;
    request.session.signedInUntil = Date.now() + 7 * day;
    request.session.cookie.maxAge = 7 * day;
    request.session.csrfToken = token();
    await save(request);
  }

  async function bootstrap(request: Request) {
    if (request.session.userId && !sessionUserId(request)) {
      await persist((done) => request.session.regenerate(done));
    }
    if (!request.session.csrfToken) {
      request.session.csrfToken = token();
      await save(request);
    }
    return request.session.csrfToken;
  }

  return { loadSession, start, end, bootstrap };
}

export function sessionUserId(request: Request) {
  const { userId, signedInUntil } = request.session;
  return signedInUntil && Date.now() < signedInUntil ? userId : undefined;
}

export function requireCsrf(
  request: Request,
  _response: Response,
  next: Parameters<RequestHandler>[2],
) {
  const supplied = request.get('X-CSRF-Token');
  const expected = request.session.csrfToken;
  if (
    !expected ||
    !tokenPattern.test(expected) ||
    !supplied ||
    !tokenPattern.test(supplied) ||
    !timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))
  ) {
    console.warn('account.csrf_rejected');
    throw new ApiError(
      403,
      'INVALID_CSRF',
      'Your security token expired. Please try again.',
    );
  }
  next();
}
