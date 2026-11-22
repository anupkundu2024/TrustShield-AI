import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import type { z } from 'zod';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { intendedDestination } from '../components/auth/ProtectedRoute';
import { Button } from '../components/ui/Button';
import { Alert, Spinner } from '../components/ui/Feedback';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/authContext';
import { loginSchema } from '../schemas/authSchemas';
import { accountErrorMessage } from '../services/authApi';

const emailKey = 'trustshield.remembered-email';

function readEmail() {
  try {
    return localStorage.getItem(emailKey) ?? '';
  } catch {
    return '';
  }
}

function remember(email?: string) {
  try {
    if (email) localStorage.setItem(emailKey, email);
    else localStorage.removeItem(emailKey);
  } catch {
    /* The form also works when browser storage is unavailable. */
  }
}

export function LoginPage() {
  const { login, sessionEnded, error: serviceError } = useAuth();
  const { state } = useLocation();
  const [savedEmail] = useState(readEmail);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail,
      password: '',
      rememberEmail: !!savedEmail,
    },
  });

  const submit = handleSubmit(async ({ email, password, rememberEmail }) => {
    setError('');
    try {
      await login({ email, password });
      remember(rememberEmail ? email : undefined);
    } catch (failure) {
      setError(accountErrorMessage(failure));
    }
  });

  return (
    <AuthLayout
      title="Welcome Back."
      subtitle="Sign in to your TrustShield AI account."
    >
      <form noValidate className="account-form" onSubmit={submit}>
        {sessionEnded && (
          <Alert variant="warning">
            Your session has ended. Please sign in again.
          </Alert>
        )}
        {(error || serviceError) && (
          <Alert variant="danger">{error || serviceError}</Alert>
        )}
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
          <input
            type="checkbox"
            className="size-4 accent-teal-700"
            {...register('rememberEmail', {
              onChange: (event) => {
                if (!event.target.checked) remember();
              },
            })}
          />
          Remember my email on this device
        </label>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Signing in" /> : 'Sign In Securely'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New to TrustShield AI?{' '}
        <Link
          className="account-link"
          to="/signup"
          state={{ from: intendedDestination(state) }}
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
