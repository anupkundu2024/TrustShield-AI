import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useLogout } from '../components/auth/useLogout';
import { Button } from '../components/ui/Button';
import { Alert, Spinner } from '../components/ui/Feedback';
import { Input } from '../components/ui/Input';
import { Badge, Card, Container } from '../components/ui/Surfaces';
import { useAuth } from '../contexts/authContext';
import { profileSchema } from '../schemas/authSchemas';
import { accountErrorMessage } from '../services/authApi';
import type { User } from '../types/auth';

function Profile({ user }: { user: User }) {
  const { updateName } = useAuth();
  const { busy, error: logoutError, signOut } = useLogout();
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: 'success' | 'danger';
  }>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName },
  });

  const submit = handleSubmit(async ({ fullName }) => {
    setFeedback(undefined);
    try {
      await updateName(fullName);
      reset({ fullName });
      setFeedback({
        message: 'Your display name has been updated.',
        variant: 'success',
      });
    } catch (failure) {
      setFeedback({ message: accountErrorMessage(failure), variant: 'danger' });
    }
  });

  return (
    <section className="account-background py-10 sm:py-16">
      <Container>
        <Link
          to="/app"
          className="account-link inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Workspace
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-navy">
          Your Profile
        </h1>
        <p className="mt-2 text-muted">
          Manage your TrustShield AI account details.
        </p>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card className="min-w-0 p-6 sm:p-8">
            <span className="inline-grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-800">
              <UserRound size={30} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-navy wrap-anywhere">
              {user.fullName}
            </h2>
            <dl className="mt-5 grid gap-4">
              <div>
                <dt className="text-sm font-semibold text-muted">Email</dt>
                <dd className="mt-1 wrap-anywhere">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-muted">Role</dt>
                <dd className="mt-1">
                  <Badge variant="neutral" className="capitalize">
                    {user.role}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-muted">
                  Member since
                </dt>
                <dd className="mt-1">
                  <time dateTime={user.createdAt}>
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'long',
                    }).format(new Date(user.createdAt))}
                  </time>
                </dd>
              </div>
            </dl>
          </Card>
          <Card className="min-w-0 p-6 sm:p-8">
            <h2 className="mb-5 text-xl font-bold text-navy">
              Profile details
            </h2>
            <form noValidate className="account-form" onSubmit={submit}>
              {feedback && (
                <Alert variant={feedback.variant}>{feedback.message}</Alert>
              )}
              <Input
                label="Full Name"
                autoComplete="name"
                required
                error={errors.fullName?.message}
                {...register('fullName', {
                  onChange: () => setFeedback(undefined),
                })}
              />
              <Button
                type="submit"
                className="justify-self-start"
                disabled={!isDirty || isSubmitting || busy}
              >
                {isSubmitting ? (
                  <Spinner label="Saving changes" />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
            <div className="mt-7 grid justify-items-start gap-3 border-t border-line pt-5">
              {logoutError && <Alert variant="danger">{logoutError}</Alert>}
              <Button
                variant="secondary"
                disabled={busy || isSubmitting}
                onClick={signOut}
              >
                {busy ? <Spinner label="Signing out" /> : 'Log Out'}
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  return user ? <Profile key={user.id} user={user} /> : null;
}
