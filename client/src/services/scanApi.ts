import { apiMutation, apiRequest } from './authApi';
import type { ScanInput, ScanReport } from '../types/scans';

export const scanApi = {
  capabilities: (signal: AbortSignal) =>
    apiRequest<{ aiEnabled: boolean; reputationEnabled: boolean }>(
      '/scans/capabilities',
      { signal },
    ),
  list: (signal?: AbortSignal, before?: string) =>
    apiRequest<{ reports: ScanReport[]; next: string | null }>(
      '/scans' + (before ? '?before=' + encodeURIComponent(before) : ''),
      { signal },
    ),
  detail: (id: string, signal: AbortSignal) =>
    apiRequest<{ report: ScanReport }>('/scans/' + encodeURIComponent(id), {
      signal,
    }),
  create: (
    input: ScanInput,
    allowAI: boolean,
    allowReputation: boolean,
    signal: AbortSignal,
  ) =>
    apiMutation<{ report: ScanReport }>(
      '/scans',
      'POST',
      { input, allowAI, allowReputation },
      {
        signal,
        timeoutMs: 55_000,
      },
    ),
  remove: (id: string) =>
    apiMutation('/scans/' + encodeURIComponent(id), 'DELETE'),
};
