import { z } from 'zod';

const urlhausResponse = z.discriminatedUnion('query_status', [
  z.object({
    query_status: z.literal('ok'),
    url_status: z.enum(['online', 'offline', 'unknown']),
  }),
  z.object({ query_status: z.literal('no_results') }),
]);

type Reputation =
  | { status: 'match'; urlStatus: 'online' | 'offline' | 'unknown' }
  | { status: 'no_match' | 'unavailable' };

export async function checkReputation(
  link: string,
  authKey: string,
  signal: AbortSignal,
): Promise<Reputation> {
  const checked = new URL(link);
  checked.username = '';
  checked.password = '';
  checked.hash = '';
  checked.search = '';

  try {
    const response = await fetch('https://urlhaus-api.abuse.ch/v1/url/', {
      method: 'POST',
      headers: { 'Auth-Key': authKey },
      body: new URLSearchParams({ url: checked.href }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]),
      redirect: 'error',
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { status: 'unavailable' };
    }
    const result = urlhausResponse.parse(await response.json());
    return result.query_status === 'ok'
      ? { status: 'match', urlStatus: result.url_status }
      : { status: 'no_match' };
  } catch {
    if (signal.aborted) throw signal.reason;
    return { status: 'unavailable' };
  }
}
