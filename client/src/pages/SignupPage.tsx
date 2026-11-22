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
import { signupSchema } from '../schemas/authSchemas';
import { accountErrorMessage } from '../services/authApi';

export function SignupPage() {
  const { register: createAccount, error: serviceError } = useAuth();
  const { state } = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = handleSubmit(async ({ fullName, email, password }) => {
    setError('');
    try {
      await createAccount({ fullName, email, password });
    } catch (failure) {
      setError(accountErrorMessage(failure));
    }
  });

  return (
    <AuthLayout
      title="Create Your Account."
      subtitle="Join TrustShield AI and take a smarter approach to digital safety."
    >
      <form noValidate className="account-form" onSubmit={submit}>
        {(error || serviceError) && (
          <Alert variant="danger">{error || serviceError}</Alert>
        )}
        <Input
          label="Full Name"
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
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
          autoComplete="new-password"
          required
          error={errors.password?.message}
          hint="Use 12–128 characters. A few words make a memorable passphrase."
          {...register('password')}
        />
        <PasswordField
          label="Confirm Password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner label="Creating your account" />
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link
          className="account-link"
          to="/login"
          state={{ from: intendedDestination(state) }}
        >
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
