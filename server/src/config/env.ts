import { isIP } from 'node:net';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const origin = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && value === url.origin;
  } catch {
    return false;
  }
});

const schema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\/[^\s]+$/),
  SESSION_SECRET: z
    .string()
    .min(32)
    .refine((value) => value.trim() === value && !value.startsWith('replace-')),
  CLIENT_URL: origin.default('http://localhost:5173'),
  PUBLIC_SITE_URL: origin
    .refine((value) => value.startsWith('https://'))
    .optional(),
  ADSENSE_PUBLISHER_ID: z
    .string()
    .regex(/^ca-pub-\d{16}$/)
    .optional(),
  SITE_CONTACT_EMAIL: z.email().optional(),
  TRUST_PROXY_HOPS: z
    .literal('1')
    .transform(() => 1)
    .optional(),
  CLOUDINARY_URL: z
    .string()
    .regex(/^cloudinary:\/\/[^\s/@:]+:[^\s/@]+@[a-z0-9_-]+\/?$/i)
    .optional(),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_MODEL: z.string().trim().min(1).optional(),
  URLHAUS_AUTH_KEY: z.string().trim().min(1).optional(),
  TRUST_PROXY: z
    .string()
    .refine((value) =>
      value.split(',').every((entry) => {
        const [host = '', prefix, extra] = entry.trim().split('/');
        const ip = isIP(host);
        if (!ip || extra !== undefined) return false;
        return (
          prefix === undefined ||
          (/^[1-9]\d*$/.test(prefix) && Number(prefix) <= (ip === 4 ? 32 : 128))
        );
      }),
    )
    .optional(),
});

export type ServerConfig = z.output<typeof schema>;

export class ConfigurationError extends Error {}

export function readConfig(): ServerConfig {
  try {
    loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw new ConfigurationError(
        'Could not load server/.env. Check the file permissions and format.',
      );
  }

  const result = schema.safeParse({
    ...process.env,
    CLIENT_URL: process.env.CLIENT_URL ?? process.env.RENDER_EXTERNAL_URL,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL?.trim() || undefined,
    ADSENSE_PUBLISHER_ID: process.env.ADSENSE_PUBLISHER_ID?.trim() || undefined,
    SITE_CONTACT_EMAIL: process.env.SITE_CONTACT_EMAIL?.trim() || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || undefined,
    URLHAUS_AUTH_KEY: process.env.URLHAUS_AUTH_KEY?.trim() || undefined,
  });
  if (!result.success) {
    const fields = Object.keys(z.treeifyError(result.error).properties ?? {});
    const hint = fields.includes('SESSION_SECRET')
      ? ' Set SESSION_SECRET in server/.env to a generated random value of at least 32 characters.'
      : '';
    throw new ConfigurationError(
      'Missing or invalid server configuration in server/.env or the process environment: ' +
        fields.join(', ') +
        '.' +
        hint,
    );
  }
  const config = result.data;
  if (
    config.NODE_ENV === 'production' &&
    !config.CLIENT_URL.startsWith('https://')
  ) {
    throw new ConfigurationError('CLIENT_URL must use HTTPS in production.');
  }
  if (config.PUBLIC_SITE_URL && config.PUBLIC_SITE_URL !== config.CLIENT_URL) {
    throw new ConfigurationError('PUBLIC_SITE_URL must match CLIENT_URL.');
  }
  return config;
}
