import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.set('Cache-Control', 'no-store').json({
    status: 'ok',
    service: 'trustshield-ai-api',
    timestamp: new Date().toISOString(),
  });
});
