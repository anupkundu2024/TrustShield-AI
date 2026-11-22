import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Spinner } from './components/ui/Feedback';
import { GuestRoute, ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider } from './contexts/AuthProvider';
import { AppHomePage } from './pages/AppHomePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { scanKinds } from './data/scanners';

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const SignupPage = lazy(() =>
  import('./pages/SignupPage').then((module) => ({
    default: module.SignupPage,
  })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);

const ScannerPage = lazy(() =>
  import('./pages/ScannerPage').then((module) => ({
    default: module.ScannerPage,
  })),
);
const ScanHistoryPage = lazy(() =>
  import('./pages/ScanHistoryPage').then((module) => ({
    default: module.ScanHistoryPage,
  })),
);
const ScanReportPage = lazy(() =>
  import('./pages/ScanHistoryPage').then((module) => ({
    default: module.ScanReportPage,
  })),
);

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route element={<GuestRoute />}>
            <Route
              path="login"
              element={
                <Suspense fallback={<Spinner label="Loading sign-in" />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="signup"
              element={
                <Suspense fallback={<Spinner label="Loading sign-up" />}>
                  <SignupPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="app" element={<AppHomePage />} />
            {scanKinds.map((kind) => (
              <Route
                key={kind}
                path={'app/scan/' + kind}
                element={
                  <Suspense
                    fallback={
                      <div className="workspace-content">
                        <Spinner label="Loading scanner" />
                      </div>
                    }
                  >
                    <ScannerPage key={kind} kind={kind} />
                  </Suspense>
                }
              />
            ))}
            <Route
              path="app/history"
              element={
                <Suspense
                  fallback={
                    <div className="workspace-content">
                      <Spinner label="Loading scan history" />
                    </div>
                  }
                >
                  <ScanHistoryPage />
                </Suspense>
              }
            />
            <Route
              path="app/history/:id"
              element={
                <Suspense
                  fallback={
                    <div className="workspace-content">
                      <Spinner label="Loading assessment" />
                    </div>
                  }
                >
                  <ScanReportPage />
                </Suspense>
              }
            />
            <Route
              path="app/profile"
              element={
                <Suspense
                  fallback={
                    <div className="workspace-content">
                      <Spinner label="Loading profile" />
                    </div>
                  }
                >
                  <ProfilePage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
