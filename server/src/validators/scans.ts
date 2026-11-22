import { z } from 'zod';
import { ApiError } from '../middleware/errors.ts';

export const maxFileBytes = 5 * 1024 * 1024;
export const maxScanBodyBytes = 7 * 1024 * 1024;

const webUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!/^https?:\/\/[^\s\\]+$/i.test(value)) return false;
    try {
      return Boolean(new URL(value).hostname);
    } catch {
      return false;
    }
  });
const message = z.string().trim().min(10).max(8000);
const imageMime = z.enum(['image/png', 'image/jpeg']);
const fileData = z
  .base64()
  .min(8)
  .max(4 * Math.ceil(maxFileBytes / 3));

const scanInput = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('message'), text: message }),
  z.strictObject({ kind: z.literal('url'), url: webUrl }),
  z.strictObject({
    kind: z.literal('job'),
    text: message,
    company: z.string().trim().max(120),
    title: z.string().trim().max(120),
    email: z.union([z.email().max(254), z.literal('')]),
    url: z.union([webUrl, z.literal('')]),
    payment: z.enum(['yes', 'no', 'unsure']),
  }),
  z.strictObject({
    kind: z.literal('document'),
    mime: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
    data: fileData,
  }),
  z.strictObject({ kind: z.literal('image'), mime: imageMime, data: fileData }),
]);

export type ScanInput = z.infer<typeof scanInput>;

const submissionSchema = z.strictObject({
  input: scanInput,
  allowAI: z.boolean(),
  allowReputation: z.boolean(),
});

export function parseScan(body: unknown) {
  const result = submissionSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      400,
      'INVALID_SCAN',
      'Check the scanner fields and try again.',
    );
  }
  const { input } = result.data;
  if (input.kind === 'document' || input.kind === 'image') {
    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length > maxFileBytes) {
      throw new ApiError(
        413,
        'FILE_TOO_LARGE',
        'Choose a file of 5 MB or smaller.',
      );
    }
    const signatures = {
      'application/pdf': '255044462d',
      'image/png': '89504e470d0a1a0a',
      'image/jpeg': 'ffd8ff',
    };
    const signature = Buffer.from(signatures[input.mime], 'hex');
    if (!bytes.subarray(0, signature.length).equals(signature)) {
      throw new ApiError(
        400,
        'INVALID_FILE',
        'The file contents do not match the selected file type.',
      );
    }
  }
  return result.data;
}
