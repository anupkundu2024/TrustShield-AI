import type { LoginInput, RegisterInput, User } from '../types/auth';

type ErrorBody = { success: false; error: { code: string; message: string } };
type ApiBody<T> = { success: true; data: T } | ErrorBody;

export class AccountError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

const origin = import.meta.env.VITE_API_ORIGIN || '';
const userFacingCodes: Record<string, string> = {
  VALIDATION_ERROR: 'Check your details and try again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHENTICATED: 'Your session has ended. Please sign in again.',
  ACCOUNT_CONFLICT:
    'An account could not be created with those details. Try signing in.',
  INVALID_CSRF: 'Your security token expired. Please try again.',
  UNTRUSTED_ORIGIN:
    'This website is not configured to access the account service.',
  RATE_LIMITED: 'Too many requests. Please wait a few minutes and try again.',
  INVALID_SCAN: 'Check the scanner fields and try again.',
  INVALID_FILE: 'The file contents do not match the selected file type.',
  FILE_TOO_LARGE: 'Choose a file of 5 MB or smaller.',
  BODY_TOO_LARGE: 'This submission exceeds the upload limit.',
  AI_CONSENT_REQUIRED: 'Confirm that you want to send this file to OpenAI.',
  AI_NOT_CONFIGURED:
    'Image and document analysis require an OpenAI API key on the server.',
  AI_UNAVAILABLE: 'File analysis is temporarily unavailable. Please try again.',
  SCAN_BUSY: 'Analysis is busy. Please try again shortly.',
  SCAN_NOT_FOUND: 'This report could not be found.',
  INVALID_SCAN_ID: 'This report identifier is invalid.',
  DATABASE_UNAVAILABLE:
    'The account service is temporarily unavailable. Please try again shortly.',
};

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 12_000,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(origin + '/api' + path, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      signal: init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout,
    });
  } catch {
    throw new AccountError(
      timeout.aborted
        ? 'The account service took too long to respond. Please try again.'
        : 'Could not reach the account service. Check your connection and try again.',
      0,
      'NETWORK',
    );
  }

  const body: ApiBody<T> | undefined = await response
    .json()
    .catch(() => undefined);
  if (response.ok && body?.success === true) return body.data;
  const code =
    body?.success === false
      ? (body.error?.code ?? 'UNEXPECTED_RESPONSE')
      : 'UNEXPECTED_RESPONSE';
  if (import.meta.env.DEV && !origin && !body && response.status >= 500) {
    throw new AccountError(
      'The local API did not respond. Run npm run dev from the project root and check the server terminal.',
      response.status,
      'LOCAL_API_UNAVAILABLE',
    );
  }
  const message =
    (import.meta.env.DEV && code === 'DATABASE_UNAVAILABLE'
      ? 'The API cannot reach MongoDB. Check MONGODB_URI in server/.env. For Atlas, check the cluster and its IP access list.'
      : userFacingCodes[code]) ??
    (response.status === 429
      ? userFacingCodes.RATE_LIMITED
      : response.status === 403
        ? 'The account service denied the request. Please try again.'
        : 'The account service could not complete the request. Please try again.');
  throw new AccountError(message!, response.status, code);
}

export async function apiMutation<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  data?: object,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> {
  async function send() {
    const { csrfToken } = await apiRequest<{ csrfToken: string }>(
      '/auth/csrf',
      { signal: options?.signal },
    );
    return apiRequest<T>(
      path,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: method === 'DELETE' ? undefined : JSON.stringify(data ?? {}),
        signal: options?.signal,
      },
      options?.timeoutMs,
    );
  }
  try {
    return await send();
  } catch (error) {
    // An explicit CSRF rejection occurs before any account changes.
    if (error instanceof AccountError && error.code === 'INVALID_CSRF')
      return send();
    throw error;
  }
}

export const authApi = {
  async me() {
    return (await apiRequest<{ user: User }>('/auth/me')).user;
  },
  async login(input: LoginInput) {
    return (await apiMutation<{ user: User }>('/auth/login', 'POST', input))
      .user;
  },
  async register(input: RegisterInput) {
    return (await apiMutation<{ user: User }>('/auth/register', 'POST', input))
      .user;
  },
  async logout() {
    await apiMutation('/auth/logout', 'POST');
  },
  async updateName(fullName: string) {
    return (
      await apiMutation<{ user: User }>('/users/me', 'PATCH', { fullName })
    ).user;
  },
};

export function accountErrorMessage(error: unknown) {
  return error instanceof AccountError
    ? error.message
    : 'Something went wrong. Please try again.';
}
