import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../contexts/authContext';
import { Button } from '../ui/Button';
import { Alert, Spinner } from '../ui/Feedback';
import { Card, Container } from '../ui/Surfaces';

import { scanKinds } from '../../data/scanners';

const destinations = new Set([
  '/app',
  '/app/profile',
  '/app/history',
  ...scanKinds.map((kind) => '/app/scan/' + kind),
]);

export function intendedDestination(state: unknown) {
  if (
    state &&
    typeof state === 'object' &&
    'from' in state &&
    typeof state.from === 'string' &&
    (destinations.has(state.from) ||
      /^\/app\/history\/[a-f0-9]{24}$/.test(state.from))
  )
    return state.from;
  return '/app';
}

function SessionStatus({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <Container className="py-16">
      <Card className="mx-auto grid max-w-xl justify-items-start gap-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-navy">
          Your TrustShield AI account
        </h1>
        {loading ? (
          <Spinner label="Checking your session" />
        ) : (
          <>
            <Alert variant="danger">{error}</Alert>
            <Button onClick={retry}>Try Again</Button>
          </>
        )}
      </Card>
    </Container>
  );
}

export function ProtectedRoute() {
  const { user, isLoading, error, refreshUser } = useAuth();
  const location = useLocation();
  if (isLoading || error) {
    return (
      <SessionStatus loading={isLoading} error={error} retry={refreshUser} />
    );
  }
  return user ? (
    <Outlet />
  ) : (
    <Navigate replace to="/login" state={{ from: location.pathname }} />
  );
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading)
    return <SessionStatus loading error="" retry={() => undefined} />;
  return user ? (
    <Navigate replace to={intendedDestination(location.state)} />
  ) : (
    <Outlet />
  );
}
