import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AccountError, authApi } from './services/authApi';
import { scanApi } from './services/scanApi';
import type { ScanReport } from './types/scans';
import type { User } from './types/auth';

vi.mock('./services/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/authApi')>();
  return {
    ...actual,
    authApi: {
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateName: vi.fn(),
    },
  };
});

vi.mock('./services/scanApi', () => ({
  scanApi: { capabilities: vi.fn(), create: vi.fn(), detail: vi.fn() },
}));

const user: User = {
  id: 'user-id',
  fullName: 'Alex Rivera',
  email: 'alex@example.com',
  role: 'user',
  createdAt: '2026-01-01T12:00:00.000Z',
};

function open(path: string, state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function fillLogin(input: ReturnType<typeof userEvent.setup>) {
  await input.type(await screen.findByLabelText('Email address'), user.email);
  await input.type(
    screen.getByLabelText('Password'),
    'correct horse battery staple',
  );
}

async function fillSignup(
  input: ReturnType<typeof userEvent.setup>,
  confirm: string,
) {
  await input.type(await screen.findByLabelText('Full Name'), user.fullName);
  await input.type(screen.getByLabelText('Email address'), user.email);
  await input.type(
    screen.getByLabelText('Password'),
    'correct horse battery staple',
  );
  await input.type(screen.getByLabelText('Confirm Password'), confirm);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(authApi.me).mockRejectedValue(
    new AccountError('Unauthenticated', 401, 'UNAUTHENTICATED'),
  );
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('opts into URLhaus from the scanner and displays the saved report', async () => {
  vi.mocked(authApi.me).mockResolvedValue(user);
  vi.mocked(scanApi.capabilities).mockResolvedValue({
    aiEnabled: false,
    reputationEnabled: true,
  });
  const report: ScanReport = {
    id: '000000000000000000000001',
    kind: 'url',
    createdAt: '2026-01-01T12:00:00.000Z',
    risk: 'high',
    source: 'rules',
    summary:
      'URLhaus had a malware-distribution record for the checked address.',
    findings: ['URLhaus classified the address as offline.'],
    actions: [],
    limitations: 'The reputation result reflects the scan time.',
  };
  vi.mocked(scanApi.create).mockResolvedValue({ report });
  vi.mocked(scanApi.detail).mockResolvedValue({ report });

  const input = open('/app/scan/url');
  const consent = await screen.findByRole<HTMLInputElement>('checkbox', {
    name: /check the link against URLhaus/i,
  });
  expect(consent.checked).toBe(false);
  await input.type(
    screen.getByRole('textbox', { name: /suspicious url/i }),
    'https://example.com',
  );
  await input.click(consent);
  await input.click(screen.getByRole('button', { name: 'Run analysis' }));

  expect(scanApi.create).toHaveBeenCalledWith(
    { kind: 'url', url: 'https://example.com' },
    false,
    true,
    expect.any(AbortSignal),
  );
  expect(await screen.findByText(report.summary)).toBeTruthy();
});

it('uploads a screenshot with consent and displays a named suspicious flag', async () => {
  vi.mocked(authApi.me).mockResolvedValue(user);
  vi.mocked(scanApi.capabilities).mockResolvedValue({
    aiEnabled: true,
    reputationEnabled: false,
  });
  const report: ScanReport = {
    id: '000000000000000000000002',
    kind: 'image',
    source: 'ai',
    risk: 'moderate',
    createdAt: '2026-01-01T12:00:00.000Z',
    summary: 'A misleading link was visible.',
    imageFlags: [
      {
        kind: 'suspicious_link',
        evidence: 'The printed link and the brand do not match.',
      },
    ],
    findings: [],
    actions: ['Verify with the official website.'],
    limitations: 'Visual evidence only.',
  };
  vi.mocked(scanApi.create).mockResolvedValue({ report });
  vi.mocked(scanApi.detail).mockResolvedValue({ report });
  const OriginalURL = URL;
  vi.stubGlobal(
    'URL',
    class extends OriginalURL {
      static createObjectURL() {
        return 'blob:fixture';
      }
      static revokeObjectURL() {}
    },
  );
  try {
    const input = open('/app/scan/image');
    const field = await screen.findByLabelText('Choose a screenshot or photo');
    const screenshot = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      'screenshot.png',
      { type: 'image/png' },
    );
    await input.upload(field, screenshot);
    const consent = await screen.findByRole('checkbox', {
      name: /use OpenAI to analyze this submission/i,
    });
    await input.click(screen.getByRole('button', { name: 'Run analysis' }));
    expect(scanApi.create).not.toHaveBeenCalled();
    await input.click(consent);
    await input.click(screen.getByRole('button', { name: 'Run analysis' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Suspicious signs in this image',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Suspicious link')).toBeTruthy();
    expect(scanApi.create).toHaveBeenCalledWith(
      { kind: 'image', mime: 'image/png', data: 'iVBORw0KGgo=' },
      true,
      false,
      expect.any(AbortSignal),
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

describe('TrustShield authentication UI', () => {
  it('validates login fields and keeps passwords hidden until requested', async () => {
    const input = open('/login');
    await input.click(
      await screen.findByRole('button', { name: 'Sign In Securely' }),
    );
    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeTruthy();
    expect(await screen.findByText('Enter your password.')).toBeTruthy();
    const password = screen.getByLabelText('Password');
    expect(password.getAttribute('type')).toBe('password');
    await input.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.getAttribute('type')).toBe('text');
    await input.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.getAttribute('type')).toBe('password');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('validates signup fields and rejects mismatched confirmation', async () => {
    const input = open('/signup');
    await input.click(
      await screen.findByRole('button', { name: 'Create Account' }),
    );
    expect(
      await screen.findByText('Enter at least 2 characters.'),
    ).toBeTruthy();
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 12 characters.')).toBeTruthy();
    await fillSignup(input, 'a different password');
    await input.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('The passwords do not match.')).toBeTruthy();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('shows initialization without exposing private information, then restores the session', async () => {
    const pending = deferred<User>();
    vi.mocked(authApi.me).mockReturnValue(pending.promise);
    open('/app');
    expect(
      screen.getByRole('heading', { name: 'Your TrustShield AI account' }),
    ).toBeTruthy();
    expect(screen.queryByText(user.email)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Get Started' })).toBeNull();
    pending.resolve(user);
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Alex' }),
    ).toBeTruthy();
  });

  it('protects deep links and returns to the requested route after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue(user);
    const input = open('/app/profile');
    await fillLogin(input);
    await input.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Your Profile' }),
    ).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });

  it('disables login during submission, ignores an external destination and remembers only opted-in email', async () => {
    const pending = deferred<User>();
    vi.mocked(authApi.login).mockReturnValue(pending.promise);
    const input = open('/login', { from: 'https://external.example/' });
    await fillLogin(input);
    await input.click(
      screen.getByRole('checkbox', { name: /remember my email/i }),
    );
    await input.click(screen.getByRole('button', { name: 'Sign In Securely' }));
    expect(
      (
        await screen.findByRole<HTMLButtonElement>('button', {
          name: 'Signing in',
        })
      ).disabled,
    ).toBe(true);
    pending.resolve(user);
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Alex' }),
    ).toBeTruthy();
    expect(localStorage.getItem('trustshield.remembered-email')).toBe(
      user.email,
    );
    expect(localStorage.length).toBe(1);
  });

  it('disables signup during submission and updates auth state after signup', async () => {
    const pending = deferred<User>();
    vi.mocked(authApi.register).mockReturnValue(pending.promise);
    const input = open('/signup');
    await fillSignup(input, 'correct horse battery staple');
    await input.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(
      (
        await screen.findByRole<HTMLButtonElement>('button', {
          name: 'Creating your account',
        })
      ).disabled,
    ).toBe(true);
    expect(authApi.register).toHaveBeenCalledWith({
      fullName: user.fullName,
      email: user.email,
      password: 'correct horse battery staple',
    });
    pending.resolve(user);
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Alex' }),
    ).toBeTruthy();
  });

  it('shows a friendly backend error and can retry session verification', async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(
      new AccountError(
        'The account service is temporarily unavailable.',
        503,
        'DATABASE_UNAVAILABLE',
      ),
    );
    const input = open('/app');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'temporarily unavailable',
    );
    vi.mocked(authApi.me).mockResolvedValue(user);
    await input.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(
      await screen.findByRole('heading', { name: 'Welcome, Alex' }),
    ).toBeTruthy();
  });

  it('updates the profile name, confirms the save and clears auth state on logout', async () => {
    vi.mocked(authApi.me).mockResolvedValue(user);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const pending = deferred<User>();
    vi.mocked(authApi.updateName).mockReturnValue(pending.promise);
    const input = open('/app/profile');
    const field = await screen.findByLabelText('Full Name');
    await input.clear(field);
    await input.type(field, 'Alex Quinn');
    await input.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(
      (
        await screen.findByRole<HTMLButtonElement>('button', {
          name: 'Saving changes',
        })
      ).disabled,
    ).toBe(true);
    expect(authApi.updateName).toHaveBeenCalledWith('Alex Quinn');
    pending.resolve({ ...user, fullName: 'Alex Quinn' });
    expect(
      await screen.findByText('Your display name has been updated.'),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Alex Quinn' })).toBeTruthy();
    await input.click(
      within(screen.getByRole('main')).getByRole('button', { name: 'Log Out' }),
    );
    await waitFor(() =>
      expect(document.querySelector('main h1')?.textContent).toMatch(
        /ahead of scams/i,
      ),
    );
    expect(screen.queryByText(user.email)).toBeNull();
    expect(authApi.logout).toHaveBeenCalledOnce();
  });

  it('redirects to sign-in and explains that the session ended when profile save returns 401', async () => {
    vi.mocked(authApi.me).mockResolvedValue(user);
    vi.mocked(authApi.updateName).mockRejectedValue(
      new AccountError('Unauthenticated', 401, 'UNAUTHENTICATED'),
    );
    const input = open('/app/profile');
    const field = await screen.findByLabelText('Full Name');
    await input.type(field, ' Jr');
    await input.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(
      await screen.findByText('Your session has ended. Please sign in again.'),
    ).toBeTruthy();
    expect(screen.queryByText(user.email)).toBeNull();
  });

  it('keeps mobile anchors and auth links functional and closes the mobile menu on navigation', async () => {
    const input = open('/');
    await waitFor(() => expect(authApi.me).toHaveBeenCalled());
    const menu = document.getElementById('mobile-navigation')!;
    await input.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(menu.getAttribute('data-open')).toBe('true');
    expect(
      within(menu).getByRole('link', { name: 'Features' }).getAttribute('href'),
    ).toBe('/#features');
    expect(
      within(menu).getByRole('link', { name: 'Sign In' }).getAttribute('href'),
    ).toBe('/login');
    await input.click(within(menu).getByRole('link', { name: 'Get Started' }));
    expect(
      await screen.findByRole('heading', { name: 'Create Your Account.' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Open menu' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });
});
