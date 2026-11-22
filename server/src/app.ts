import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { createDatabase } from './config/database.ts';
import type { ServerConfig } from './config/env.ts';
import {
  ApiError,
  databaseUnavailable,
  handleError,
  notFound,
} from './middleware/errors.ts';
import { healthRouter } from './routes/health.ts';
import { createSiteRouter } from './routes/site.ts';

export function createApp(
  config: ServerConfig,
  database: ReturnType<typeof createDatabase>,
) {
  const app = express();
  app.disable('x-powered-by');
  const trustedProxy = config.TRUST_PROXY ?? config.TRUST_PROXY_HOPS;
  if (trustedProxy) app.set('trust proxy', trustedProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { imgSrc: ["'self'", 'data:', 'blob:'] },
      },
    }),
  );
  app.use('/api', healthRouter);

  const api = Router();
  const protectedPaths = ['/auth', '/users', '/scans'];
  api.use(protectedPaths, (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.on('finish', () => {
      console.info('account.request', request.method, response.statusCode);
    });
    if (config.NODE_ENV === 'production' && !request.secure) {
      throw new ApiError(
        400,
        'HTTPS_REQUIRED',
        'Use a secure HTTPS connection.',
      );
    }
    const origin = request.get('Origin');
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if ((origin || mutation) && origin !== config.CLIENT_URL) {
      console.warn('account.origin_rejected');
      throw new ApiError(
        403,
        'UNTRUSTED_ORIGIN',
        'This request origin is not allowed.',
      );
    }
    next();
  });
  api.use(
    protectedPaths,
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      exposedHeaders: ['Retry-After'],
      maxAge: 600,
    }),
  );
  api.use(protectedPaths, database.limitRequests);
  api.use(['/auth', '/users'], express.json({ limit: '8kb', inflate: false }));
  api.use(protectedPaths, (request, response, next) => {
    const accounts = database.readyAccounts();
    if (!accounts) throw databaseUnavailable();
    accounts.sessions.loadSession(request, response, next);
  });
  api.use((request, response, next) => {
    const accounts = database.readyAccounts();
    if (!accounts && request.session) throw databaseUnavailable();
    if (accounts) accounts.router(request, response, next);
    else next();
  });

  app.use('/api', api);
  app.use('/api', notFound);
  if (config.NODE_ENV === 'production') app.use(createSiteRouter(config));
  app.use(notFound);
  app.use(handleError);
  return app;
}
