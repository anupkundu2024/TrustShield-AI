import { storeFile, deleteFile, type Asset } from '../services/cloudinary.ts';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { requireCsrf, sessionUserId } from '../config/session.ts';
import type { ServerConfig } from '../config/env.ts';
import { ApiError, fail } from '../middleware/errors.ts';
import { analyzeScan, type Analysis } from '../services/analyzeScan.ts';
import {
  maxScanBodyBytes,
  parseScan,
  type ScanInput,
} from '../validators/scans.ts';

type StoredScan = Analysis & {
  asset?: Asset;
  owner: string;
  kind: ScanInput['kind'];
  createdAt: Date;
};

function publicScan({
  _id,
  kind,
  createdAt,
  source,
  risk,
  summary,
  findings,
  actions,
  limitations,
  imageFlags,
}: StoredScan & { _id: mongoose.Types.ObjectId }) {
  return {
    id: _id.toHexString(),
    kind,
    createdAt,
    source,
    risk,
    summary,
    findings,
    actions,
    limitations,
    imageFlags,
  };
}

function scanId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/.test(value)) {
    throw new ApiError(
      400,
      'INVALID_SCAN_ID',
      'The report identifier is invalid.',
    );
  }
  return new mongoose.Types.ObjectId(value);
}

export async function createScanRoutes(
  config: ServerConfig,
  connection: mongoose.Connection,
) {
  if (!connection.db) throw new Error('MongoDB is unavailable');
  const scans = connection.db.collection<StoredScan>('scans');
  await scans.createIndex({ owner: 1, _id: -1 });
  const router = Router();
  const active = new Set<string>();
  const limit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (request) => sessionUserId(request)!,
    handler: (_request, response) =>
      fail(
        response,
        429,
        'RATE_LIMITED',
        'Too many analyses. Try again in a few minutes.',
      ),
  });

  router.get('/capabilities', (_request, response) => {
    response.json({
      success: true,
      data: {
        aiEnabled: Boolean(config.OPENAI_API_KEY),
        reputationEnabled: Boolean(config.URLHAUS_AUTH_KEY),
      },
    });
  });

  router.get('/', async (request, response) => {
    const owner = sessionUserId(request)!;
    const before =
      request.query.before === undefined
        ? undefined
        : scanId(request.query.before);
    const query = before ? { owner, _id: { $lt: before } } : { owner };
    const rows = await scans.find(query).sort({ _id: -1 }).limit(21).toArray();
    const reports = rows.slice(0, 20).map(publicScan);
    response.json({
      success: true,
      data: { reports, next: rows.length > 20 ? reports.at(-1)?.id : null },
    });
  });

  router.get('/:id', async (request, response) => {
    const report = await scans.findOne({
      _id: scanId(request.params.id),
      owner: sessionUserId(request)!,
    });
    if (!report)
      throw new ApiError(
        404,
        'SCAN_NOT_FOUND',
        'This report could not be found.',
      );
    response.json({ success: true, data: { report: publicScan(report) } });
  });

  router.delete('/:id', requireCsrf, async (request, response) => {
    const filter = {
      _id: scanId(request.params.id),
      owner: sessionUserId(request)!,
    };
    const existing = await scans.findOne(filter);
    if (existing?.asset) await deleteFile(config, existing.asset);
    const result = await scans.deleteOne(filter);
    if (!result.deletedCount)
      throw new ApiError(
        404,
        'SCAN_NOT_FOUND',
        'This report could not be found.',
      );
    response.json({ success: true, data: {} });
  });

  router.post(
    '/',
    requireCsrf,
    limit,
    express.json({ limit: maxScanBodyBytes, inflate: false }),
    async (request, response) => {
      const owner = sessionUserId(request)!;
      if (active.has(owner) || active.size >= 8) {
        throw new ApiError(
          429,
          'SCAN_BUSY',
          'Analysis is busy. Please try again shortly.',
        );
      }
      const submission = parseScan(request.body);
      const cancellation = new AbortController();
      const cancel = () => cancellation.abort();
      response.once('close', cancel);
      active.add(owner);
      try {
        const analysis = await analyzeScan(
          submission,
          config,
          cancellation.signal,
        );
        if (cancellation.signal.aborted) return;
        const input = submission.input;
        const asset =
          config.CLOUDINARY_URL &&
          (input.kind === 'image' || input.kind === 'document')
            ? await storeFile(config, input)
            : undefined;
        const report = {
          ...(asset && { asset }),
          ...analysis,
          owner,
          kind: submission.input.kind,
          createdAt: new Date(),
        };
        const { insertedId } = await scans
          .insertOne(report)
          .catch(async (error: unknown) => {
            if (asset) await deleteFile(config, asset);
            throw error;
          });
        response.status(201).json({
          success: true,
          data: { report: publicScan({ ...report, _id: insertedId }) },
        });
      } catch (error) {
        if (!cancellation.signal.aborted) throw error;
      } finally {
        active.delete(owner);
        response.off('close', cancel);
      }
    },
  );

  return router;
}
