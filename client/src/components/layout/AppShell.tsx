import { Outlet, useLocation } from 'react-router';
import { useEffect, useRef } from 'react';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { WorkspaceFrame } from './WorkspaceFrame';
import { useAuth } from '../../contexts/authContext';
import { scanKinds, scanners } from '../../data/scanners';

const accountTitles: Record<string, string> = {
  '/login': 'Sign In',
  '/signup': 'Create Account',
  '/app': 'My Workspace',
  '/app/profile': 'Profile',
  '/app/history': 'Scan History',
  ...Object.fromEntries(
    scanKinds.map((kind) => ['/app/scan/' + kind, scanners[kind].label]),
  ),
};

export function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const workspace =
    user &&
    (location.pathname === '/app' || location.pathname.startsWith('/app/'));
  const main = useRef<HTMLElement>(null);
  const previousLocation = useRef<typeof location | null>(null);

  useEffect(() => {
    if (previousLocation.current === location) return;
    const isInitialVisit = previousLocation.current === null;
    previousLocation.current = location;
    document.title =
      location.pathname === '/'
        ? 'TrustShield AI | Scam, Screenshot & Phishing Link Checker'
        : (accountTitles[location.pathname] ??
            (location.pathname.startsWith('/app/history/')
              ? 'Assessment Report'
              : 'Page not found')) + ' | TrustShield AI';

    const id =
      location.hash === '#coming-next' ? 'features' : location.hash.slice(1);
    const target = id && document.getElementById(id);
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    } else if (!isInitialVisit || location.pathname !== '/') {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    }
  }, [location]);

  if (workspace) {
    return (
      <>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <WorkspaceFrame>
          <main id="main" ref={main} tabIndex={-1}>
            <Outlet />
          </main>
        </WorkspaceFrame>
      </>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" ref={main} tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
