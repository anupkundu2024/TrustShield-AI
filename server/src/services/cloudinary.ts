import { createHash, randomUUID } from 'node:crypto';
import type { ServerConfig } from '../config/env.ts';
import { ApiError } from '../middleware/errors.ts';
import type { ScanInput } from '../validators/scans.ts';

export type Asset = { publicId: string; resource: 'image' | 'raw' };

async function request(config: ServerConfig, asset: Asset, file?: string) {
  if (!config.CLOUDINARY_URL)
    throw new ApiError(
      503,
      'STORAGE_UNAVAILABLE',
      'Cloudinary storage is unavailable.',
    );
  const credentials = new URL(config.CLOUDINARY_URL);
  const fields = {
    public_id: asset.publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'authenticated',
  };
  const signature = createHash('sha256')
    .update(
      Object.entries(fields)
        .map(([k, v]) => k + '=' + v)
        .join('&') + decodeURIComponent(credentials.password),
    )
    .digest('hex');
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  body.set('api_key', decodeURIComponent(credentials.username));
  body.set('signature', signature);
  if (file) body.set('file', file);
  try {
    const action = file ? 'upload' : 'destroy';
    const response = await fetch(
      'https://api.cloudinary.com/v1_1/' +
        credentials.hostname +
        '/' +
        asset.resource +
        '/' +
        action,
      {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(45000),
      },
    );
    const result = await response.json();
    if (
      response.ok &&
      (file
        ? result.public_id === asset.publicId
        : ['ok', 'not found'].includes(result.result))
    )
      return;
  } catch {
    // Map provider failures to an error that is safe to display.
  }
  throw new ApiError(
    502,
    'STORAGE_FAILED',
    'Cloudinary could not complete the file operation. Please retry.',
  );
}

export async function storeFile(
  config: ServerConfig,
  input: Extract<ScanInput, { kind: 'document' | 'image' }>,
) {
  const pdf = input.mime === 'application/pdf';
  const asset: Asset = {
    publicId: 'trustshield/' + randomUUID() + (pdf ? '.pdf' : ''),
    resource: pdf ? 'raw' : 'image',
  };
  await request(config, asset, 'data:' + input.mime + ';base64,' + input.data);
  return asset;
}

export function deleteFile(config: ServerConfig, asset: Asset) {
  return request(config, asset);
}
