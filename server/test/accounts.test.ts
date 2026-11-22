import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import argon2 from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { createApp } from '../src/app.ts';
import { createDatabase } from '../src/config/database.ts';
import type { ServerConfig } from '../src/config/env.ts';

const config: ServerConfig = {
  CLIENT_URL: 'http://127.0.0.1:5173',
  SESSION_SECRET: randomBytes(48).toString('hex'),
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:1/trustshield_isolated_test',
  PORT: 3001,
};
const email = 'test@example.com';
const password = '  blue river café 🌿  ';
const credentials = { email, password };
const registration = { ...credentials, fullName: 'Example User' };

async function launch(settings: ServerConfig) {
  const database = createDatabase(settings);
  const server = createApp(settings, database).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    database,
    url: 'http://127.0.0.1:' + address.port,
    async close() {
      await closeServer(server);
      await database.close();
    },
  };
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

class Browser {
  cookie = '';
  readonly url: string;
  readonly origin: string;
  readonly forwarded: boolean;

  constructor(url: string, origin = config.CLIENT_URL, forwarded = false) {
    this.url = url;
    this.origin = origin;
    this.forwarded = forwarded;
  }

  async send(
    path: string,
    {
      method = 'GET',
      token,
      data,
      origin = this.origin,
      raw,
    }: {
      method?: string;
      token?: string;
      data?: object;
      origin?: string | null;
      raw?: string;
    } = {},
  ) {
    const headers = new Headers();
    if (origin) headers.set('Origin', origin);
    if (this.cookie) headers.set('Cookie', this.cookie);
    if (token) headers.set('X-CSRF-Token', token);
    if (data || raw) headers.set('Content-Type', 'application/json');
    if (this.forwarded) headers.set('X-Forwarded-Proto', 'https');
    const response = await fetch(this.url + '/api' + path, {
      method,
      headers,
      body: raw ?? (data ? JSON.stringify(data) : undefined),
    });
    for (const cookie of response.headers.getSetCookie()) {
      this.cookie = /expires=Thu, 01 Jan 1970/i.test(cookie)
        ? ''
        : (cookie.split(';')[0] ?? '');
    }
    return response;
  }

  async csrf() {
    const response = await this.send('/auth/csrf');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { data } = await response.json();
    assert.match(data.csrfToken, /^[a-f0-9]{64}$/);
    return data.csrfToken as string;
  }

  async mutate(path: string, data?: object, method = 'POST') {
    return this.send(path, { method, data, token: await this.csrf() });
  }
}

async function errorCode(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, code);
  assert.deepEqual(Object.keys(body.error).sort(), ['code', 'message']);
  return body;
}

async function safeUser(
  response: Response,
  status: number,
  name = 'Example User',
) {
  assert.equal(response.status, status);
  const {
    success,
    data: { user },
  } = await response.json();
  assert.equal(success, true);
  assert.deepEqual(Object.keys(user).sort(), [
    'createdAt',
    'email',
    'fullName',
    'id',
    'role',
  ]);
  assert.equal(user.email, email);
  assert.equal(user.fullName, name);
  assert.equal(user.role, 'user');
  return user;
}

describe('account API with a disposable MongoDB process', () => {
  let mongo: MongoMemoryServer;
  let api: Awaited<ReturnType<typeof launch>>;
  let registered: Browser;

  before(async () => {
    mongo = await MongoMemoryServer.create({
      instance: { ip: '127.0.0.1', dbName: 'trustshield_isolated_test' },
    });
    api = await launch({
      ...config,
      MONGODB_URI: mongo.getUri('trustshield_isolated_test'),
    });
    await api.database.connect();
    assert.ok(api.database.readyAccounts());
    registered = new Browser(api.url);
  });

  after(async () => {
    try {
      await api?.close();
    } finally {
      await mongo?.stop();
    }
  });

  it('registers, normalizes email, rotates session and CSRF, and stores only an Argon2id hash', async () => {
    const token = await registered.csrf();
    const anonymousCookie = registered.cookie;
    const response = await registered.send('/auth/register', {
      method: 'POST',
      token,
      data: { ...registration, email: '  TEST@EXAMPLE.COM  ' },
    });
    assert.match(
      response.headers.get('set-cookie') ?? '',
      /HttpOnly; SameSite=Lax/i,
    );
    assert.doesNotMatch(response.headers.get('set-cookie') ?? '', /; Secure/i);
    const user = await safeUser(response, 201);
    assert.notEqual(registered.cookie, anonymousCookie);
    assert.notEqual(await registered.csrf(), token);
    const replay = new Browser(api.url);
    replay.cookie = anonymousCookie;
    await errorCode(await replay.send('/auth/me'), 401, 'UNAUTHENTICATED');
    const stored = await api.database.connection
      .collection('users')
      .findOne({ email });
    assert.ok(stored);
    assert.equal(String(stored._id), user.id);
    assert.match(stored.passwordHash, /^\$argon2id\$/);
    assert.equal(await argon2.verify(stored.passwordHash, password), true);
    assert.equal(Object.hasOwn(stored, 'password'), false);
    const sessionRecord = await api.database.connection
      .collection('sessions')
      .findOne({});
    assert.ok(sessionRecord);
    assert.equal(sessionRecord.session.includes(user.id), true);
    assert.equal(sessionRecord.session.includes(email), false);
  });

  it('rejects duplicate normalized emails and enforces uniqueness on concurrent writes', async () => {
    await errorCode(
      await registered.mutate('/auth/register', {
        ...registration,
        email: email.toUpperCase(),
      }),
      409,
      'ACCOUNT_CONFLICT',
    );
    const racers = [new Browser(api.url), new Browser(api.url)];
    const signups = await Promise.all(
      racers.map((browser) =>
        browser.mutate('/auth/register', {
          ...registration,
          email: 'race@example.com',
        }),
      ),
    );
    assert.deepEqual(
      signups.map((response) => response.status).sort(),
      [201, 409],
    );
    assert.equal(
      await api.database.connection
        .collection('users')
        .countDocuments({ email: 'race@example.com' }),
      1,
    );
  });

  it('rejects invalid emails, short passwords and public role escalation', async () => {
    const browser = new Browser(api.url);
    for (const input of [
      { ...registration, email: 'invalid' },
      { ...registration, password: 'short' },
      { ...registration, password: 'x'.repeat(129) },
      { ...registration, role: 'admin' },
    ]) {
      await errorCode(
        await browser.mutate('/auth/register', input),
        400,
        'VALIDATION_ERROR',
      );
    }
  });

  it('logs in, regenerates the cookie and uses identical failures for bad passwords and unknown users', async () => {
    const browser = new Browser(api.url);
    const badPassword = await errorCode(
      await browser.mutate('/auth/login', {
        ...credentials,
        password: 'incorrect',
      }),
      401,
      'INVALID_CREDENTIALS',
    );
    const unknown = await errorCode(
      await browser.mutate('/auth/login', {
        ...credentials,
        email: 'unknown@example.com',
      }),
      401,
      'INVALID_CREDENTIALS',
    );
    assert.deepEqual(badPassword, unknown);
    const previous = browser.cookie;
    await safeUser(await browser.mutate('/auth/login', credentials), 200);
    assert.notEqual(browser.cookie, previous);
    await safeUser(await browser.send('/auth/me'), 200);
    await safeUser(await registered.send('/auth/me'), 200);
    await errorCode(
      await new Browser(api.url).send('/auth/me'),
      401,
      'UNAUTHENTICATED',
    );
  });

  it('persists sessions across an API restart and uses secure cookie attributes behind the trusted proxy', async () => {
    const uri = mongo.getUri('trustshield_isolated_test');
    const restarted = await launch({ ...config, MONGODB_URI: uri });
    const production = await launch({
      ...config,
      MONGODB_URI: uri,
      NODE_ENV: 'production',
      CLIENT_URL: 'https://app.example.com',
      TRUST_PROXY: '127.0.0.1',
    });
    try {
      await restarted.database.connect();
      const browser = new Browser(restarted.url);
      browser.cookie = registered.cookie;
      await safeUser(await browser.send('/auth/me'), 200);

      await production.database.connect();
      const insecure = new Browser(production.url, 'https://app.example.com');
      await errorCode(await insecure.send('/auth/csrf'), 400, 'HTTPS_REQUIRED');
      const secure = new Browser(
        production.url,
        'https://app.example.com',
        true,
      );
      const response = await secure.send('/auth/csrf');
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie') ?? '';
      assert.match(cookie, /^__Host-trustshield\.sid=/);
      assert.match(cookie, /Path=\/;.*HttpOnly; Secure; SameSite=Lax/i);
      assert.doesNotMatch(cookie, /; Domain=/i);
    } finally {
      await Promise.all([production.close(), restarted.close()]);
    }
  });

  it('updates only the authenticated user name, persists it and blocks unauthorized writes', async () => {
    await errorCode(
      await new Browser(api.url).send('/users/me', {
        method: 'PATCH',
        data: { fullName: 'Intruder' },
      }),
      401,
      'UNAUTHENTICATED',
    );
    await errorCode(
      await registered.mutate(
        '/users/me',
        { fullName: 'New Name', role: 'admin' },
        'PATCH',
      ),
      400,
      'VALIDATION_ERROR',
    );
    await safeUser(
      await registered.mutate(
        '/users/me',
        { fullName: '  New Name  ' },
        'PATCH',
      ),
      200,
      'New Name',
    );
    await safeUser(await registered.send('/auth/me'), 200, 'New Name');
    const stored = await api.database.connection
      .collection('users')
      .findOne({ email });
    assert.equal(stored?.fullName, 'New Name');
    assert.equal(stored?.role, 'user');
  });

  it('requires valid CSRF and a trusted Origin on public and authenticated mutations', async () => {
    const browser = new Browser(api.url);
    for (const path of ['/auth/login', '/auth/logout']) {
      await errorCode(
        await browser.send(path, { method: 'POST', data: credentials }),
        403,
        'INVALID_CSRF',
      );
    }
    const changes = { method: 'PATCH', data: { fullName: 'Blocked' } };
    await errorCode(
      await registered.send('/users/me', changes),
      403,
      'INVALID_CSRF',
    );
    await errorCode(
      await registered.send('/users/me', { ...changes, token: 'a'.repeat(64) }),
      403,
      'INVALID_CSRF',
    );
    const token = await registered.csrf();
    await errorCode(
      await registered.send('/users/me', {
        ...changes,
        token,
        origin: 'https://other.example',
      }),
      403,
      'UNTRUSTED_ORIGIN',
    );
    await errorCode(
      await registered.send('/users/me', { ...changes, token, origin: null }),
      403,
      'UNTRUSTED_ORIGIN',
    );
    const preflight = await registered.send('/users/me', { method: 'OPTIONS' });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get('access-control-allow-origin'),
      config.CLIENT_URL,
    );
    assert.equal(
      preflight.headers.get('access-control-allow-credentials'),
      'true',
    );
    await errorCode(
      await registered.send('/users/me', { ...changes, token, raw: '{"' }),
      400,
      'INVALID_JSON',
    );
    await errorCode(
      await registered.send('/users/me', {
        ...changes,
        token,
        raw: 'x'.repeat(9000),
      }),
      413,
      'BODY_TOO_LARGE',
    );
    await safeUser(await registered.send('/auth/me'), 200, 'New Name');
  });

  it('logs out and rejects the old cookie immediately', async () => {
    const oldCookie = registered.cookie;
    const response = await registered.mutate('/auth/logout');
    assert.equal(response.status, 200);
    assert.equal(registered.cookie, '');
    assert.match(
      response.headers.get('set-cookie') ?? '',
      /Path=\/;.*HttpOnly; SameSite=Lax/i,
    );
    registered.cookie = oldCookie;
    await errorCode(await registered.send('/auth/me'), 401, 'UNAUTHENTICATED');
    registered.cookie = '';
  });

  it('rate limits both sign-in and registration with retry information', async () => {
    const isolated = await launch({
      ...config,
      MONGODB_URI: mongo.getUri('trustshield_isolated_test'),
    });
    try {
      await isolated.database.connect();
      const browser = new Browser(isolated.url);
      for (const { path, attempts } of [
        { path: '/auth/login', attempts: 15 },
        { path: '/auth/register', attempts: 8 },
      ]) {
        for (let count = 0; count < attempts; count++) {
          await errorCode(
            await browser.send(path, { method: 'POST', data: credentials }),
            403,
            'INVALID_CSRF',
          );
        }
        const response = await browser.send(path, {
          method: 'POST',
          data: credentials,
        });
        assert.ok(response.headers.has('retry-after'));
        await errorCode(response, 429, 'RATE_LIMITED');
      }
    } finally {
      await isolated.close();
    }
  });

  it('validates scans and keeps derived reports private to their owners', async () => {
    const owner = new Browser(api.url);
    const other = new Browser(api.url);
    const anonymous = new Browser(api.url);
    await safeUser(
      await owner.mutate('/auth/login', credentials),
      200,
      'New Name',
    );
    assert.equal(
      (
        await other.mutate('/auth/login', {
          ...credentials,
          email: 'race@example.com',
        })
      ).status,
      200,
    );
    const marker = 'private-reference-9724';
    const data = {
      input: { kind: 'message', text: 'Urgent: send your OTP now. ' + marker },
      allowAI: false,
      allowReputation: false,
    };
    await errorCode(await anonymous.send('/scans'), 401, 'UNAUTHENTICATED');
    await errorCode(
      await owner.send('/scans', { method: 'POST', data }),
      403,
      'INVALID_CSRF',
    );
    await errorCode(
      await owner.mutate('/scans', {
        ...data,
        input: { kind: 'url', url: 'file:///tmp/example' },
      }),
      400,
      'INVALID_SCAN',
    );
    await errorCode(
      await owner.mutate('/scans', {
        ...data,
        input: {
          kind: 'document',
          mime: 'application/pdf',
          data: Buffer.from('not a pdf').toString('base64'),
        },
      }),
      400,
      'INVALID_FILE',
    );
    await errorCode(
      await owner.mutate('/scans', {
        ...data,
        input: {
          kind: 'document',
          mime: 'application/pdf',
          data: Buffer.from('%PDF-1.7').toString('base64'),
        },
      }),
      503,
      'AI_NOT_CONFIGURED',
    );
    const result = await owner.mutate('/scans', data);
    assert.equal(result.status, 201);
    const {
      data: { report },
    } = await result.json();
    assert.equal(report.source, 'rules');
    assert.equal(report.risk, 'moderate');
    assert.ok(report.findings.length >= 2);
    assert.doesNotMatch(JSON.stringify(report), new RegExp(marker));
    assert.ok(!Object.hasOwn(report, 'owner'));
    const stored = await api.database.connection
      .collection('scans')
      .findOne({});
    assert.ok(stored);
    assert.doesNotMatch(JSON.stringify(stored), new RegExp(marker));
    const path = '/scans/' + report.id;
    assert.deepEqual(
      (await (await owner.send(path)).json()).data.report,
      report,
    );
    assert.deepEqual((await (await owner.send('/scans')).json()).data.reports, [
      report,
    ]);
    assert.deepEqual(
      (await (await other.send('/scans')).json()).data.reports,
      [],
    );
    await errorCode(await other.send(path), 404, 'SCAN_NOT_FOUND');
    await errorCode(
      await other.send(path, { method: 'DELETE', token: await other.csrf() }),
      404,
      'SCAN_NOT_FOUND',
    );
    assert.equal(
      (await owner.send(path, { method: 'DELETE', token: await owner.csrf() }))
        .status,
      200,
    );
    await errorCode(await owner.send(path), 404, 'SCAN_NOT_FOUND');
  });

  it('sends submissions only to opted-in providers and uses real reputation evidence', async (context) => {
    const providerApi = await launch({
      ...config,
      MONGODB_URI: mongo.getUri('trustshield_isolated_test'),
      OPENAI_API_KEY: 'fixture-openai',
      URLHAUS_AUTH_KEY: 'fixture-urlhaus',
    });
    const realFetch = fetch;
    const providerCalls: string[] = [];
    try {
      await providerApi.database.connect();
      context.mock.method(
        globalThis,
        'fetch',
        async (input: string | URL, init?: RequestInit) => {
          const address = new URL(input.toString());
          if (address.host === 'api.openai.com') {
            assert.equal(address.pathname, '/v1/responses');
            assert.equal(init?.redirect, 'error');
            const body = JSON.parse(String(init?.body));
            assert.equal(body.store, false);
            const filePart = body.input[0].content[1];
            if (filePart.type === 'input_image') {
              assert.match(filePart.image_url, /^data:image\/png;base64,/);
              assert.equal(filePart.detail, 'high');
              assert.ok(
                body.text.format.schema.required.includes('imageFlags'),
              );
              providerCalls.push('openai-image');
              return Response.json({
                status: 'completed',
                output: [
                  {
                    content: [
                      {
                        type: 'output_text',
                        text: JSON.stringify({
                          risk: 'low',
                          summary:
                            'The screenshot contains a misleading sign-in link.',
                          findings: [],
                          actions: ['Open the official website independently.'],
                          limitations:
                            'The image alone cannot establish authenticity.',
                          imageFlags: [
                            {
                              kind: 'suspicious_link',
                              evidence:
                                'The visible domain differs from the brand in the header.',
                            },
                          ],
                        }),
                      },
                    ],
                  },
                ],
              });
            }
            assert.equal(filePart.type, 'input_file');
            providerCalls.push('openai');
            return Response.json({
              status: 'completed',
              output: [
                {
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        risk: 'moderate',
                        summary: 'Check the source.',
                        findings: ['An upfront payment is requested.'],
                        actions: ['Check with the employer.'],
                        limitations: 'The picture may omit context.',
                      }),
                    },
                  ],
                },
              ],
            });
          }
          if (address.host === 'urlhaus-api.abuse.ch') {
            assert.equal(address.pathname, '/v1/url/');
            assert.equal(address.search, '');
            assert.equal(init?.method, 'POST');
            assert.equal(init?.redirect, 'error');
            assert.equal(
              new Headers(init?.headers).get('Auth-Key'),
              'fixture-urlhaus',
            );
            const checked = new URLSearchParams(String(init?.body)).get('url');
            providerCalls.push('urlhaus');
            if (checked === 'https://example.com/no-match')
              return Response.json({ query_status: 'no_results' });
            if (checked === 'https://example.com/unavailable')
              return Response.json({ query_status: 'invalid_url' });
            assert.equal(checked, 'https://example.com/path');
            return Response.json({ query_status: 'ok', url_status: 'offline' });
          }
          assert.equal(address.hostname, '127.0.0.1');
          return realFetch(input, init);
        },
      );
      const owner = new Browser(providerApi.url);
      await safeUser(
        await owner.mutate('/auth/login', credentials),
        200,
        'New Name',
      );
      const data = {
        input: {
          kind: 'url',
          url: 'https://person:password@example.com/path?token=secret#fragment',
        },
        allowAI: false,
        allowReputation: false,
      };
      const local = await owner.mutate('/scans', data);
      assert.equal(local.status, 201);
      assert.deepEqual(providerCalls, []);
      const reputation = await owner.mutate('/scans', {
        ...data,
        allowReputation: true,
      });
      assert.equal(reputation.status, 201);
      const {
        data: { report: flagged },
      } = await reputation.json();
      assert.equal(flagged.risk, 'high');
      assert.match(flagged.findings.join(' '), /URLhaus.*offline/);
      assert.deepEqual(providerCalls, ['urlhaus']);

      for (const [path, expected] of [
        ['no-match', /URLhaus returned no record/],
        ['unavailable', /URLhaus could not check/],
      ] as const) {
        const result = await owner.mutate('/scans', {
          ...data,
          input: { kind: 'url', url: 'https://example.com/' + path },
          allowReputation: true,
        });
        assert.equal(result.status, 201);
        const {
          data: { report },
        } = await result.json();
        assert.equal(report.risk, 'unknown');
        assert.match(report.limitations, expected);
      }
      const document = {
        ...data,
        input: {
          kind: 'document',
          mime: 'application/pdf',
          data: Buffer.from('%PDF-1.7').toString('base64'),
        },
      };
      await errorCode(
        await owner.mutate('/scans', document),
        400,
        'AI_CONSENT_REQUIRED',
      );
      const ai = await owner.mutate('/scans', { ...document, allowAI: true });
      assert.equal(ai.status, 201);
      assert.equal((await ai.json()).data.report.source, 'ai');
      const image = {
        ...data,
        input: {
          kind: 'image',
          mime: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3i0AAAAASUVORK5CYII=',
        },
      };
      await errorCode(
        await owner.mutate('/scans', image),
        400,
        'AI_CONSENT_REQUIRED',
      );
      await errorCode(
        await owner.mutate('/scans', {
          ...image,
          allowAI: true,
          input: { ...image.input, data: document.input.data },
        }),
        400,
        'INVALID_FILE',
      );
      const photo = await owner.mutate('/scans', { ...image, allowAI: true });
      assert.equal(photo.status, 201);
      const {
        data: { report: imageReport },
      } = await photo.json();
      assert.equal(imageReport.kind, 'image');
      assert.equal(imageReport.risk, 'moderate');
      assert.deepEqual(imageReport.imageFlags, [
        {
          kind: 'suspicious_link',
          evidence: 'The visible domain differs from the brand in the header.',
        },
      ]);
      assert.equal(
        JSON.stringify(imageReport).includes(image.input.data),
        false,
      );
      const saved = await owner.send('/scans/' + imageReport.id);
      assert.deepEqual(
        (await saved.json()).data.report.imageFlags,
        imageReport.imageFlags,
      );
      assert.deepEqual(providerCalls, [
        'urlhaus',
        'urlhaus',
        'urlhaus',
        'openai',
        'openai-image',
      ]);
    } finally {
      await providerApi.close();
    }
  });

  it('returns a safe database error after disconnect', async () => {
    await api.database.close();
    await errorCode(
      await registered.send('/auth/me'),
      503,
      'DATABASE_UNAVAILABLE',
    );
    assert.equal((await registered.send('/health')).status, 200);
  });
});

it('keeps health available while an unreachable database prevents account requests', async () => {
  const api = await launch(config);
  try {
    await api.database.connect();
    const browser = new Browser(api.url);
    const response = await browser.send('/health');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
    await errorCode(
      await browser.send('/auth/csrf'),
      503,
      'DATABASE_UNAVAILABLE',
    );
    await errorCode(
      await browser.send('/users/me', {
        method: 'PATCH',
        data: { fullName: 'Offline' },
      }),
      503,
      'DATABASE_UNAVAILABLE',
    );
  } finally {
    await api.close();
  }
});
