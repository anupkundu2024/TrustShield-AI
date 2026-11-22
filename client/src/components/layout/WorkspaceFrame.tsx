import {
  History,
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { scanKinds, scanners } from '../../data/scanners';
import { useAuth } from '../../contexts/authContext';
import { useLogout } from '../auth/useLogout';
import { Alert } from '../ui/Feedback';

const navigation = [
  { to: '/app', icon: LayoutGrid, label: 'Overview', end: true },
  ...scanKinds.map((kind) => ({
    to: '/app/scan/' + kind,
    icon: scanners[kind].icon,
    label: scanners[kind].label,
    end: true,
  })),
  { to: '/app/history', icon: History, label: 'Scan History', end: false },
  { to: '/app/profile', icon: UserRound, label: 'Profile', end: true },
];

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { key, pathname } = useLocation();
  const { busy, error, signOut } = useLogout();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === key;
  const toggle = useRef<HTMLButtonElement>(null);
  const heading =
    navigation.find(
      ({ to, end }) =>
        pathname === to || (!end && pathname.startsWith(to + '/')),
    )?.label ?? 'Workspace';

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenAt(null);
        toggle.current?.focus();
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <div className="workspace">
      <header className="workspace-top">
        <button
          ref={toggle}
          className="workspace-toggle"
          type="button"
          aria-controls="workspace-navigation"
          aria-expanded={open}
          aria-label={open ? 'Close workspace menu' : 'Open workspace menu'}
          onClick={() => setOpenAt(open ? null : key)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <p className="workspace-location">{heading}</p>
        <Link
          to="/app/profile"
          className="workspace-user"
          aria-label="Account profile"
        >
          <span aria-hidden="true">
            {user?.fullName.trim().charAt(0).toUpperCase()}
          </span>
          <strong>{user?.fullName}</strong>
        </Link>
      </header>

      <aside
        className="workspace-side"
        id="workspace-navigation"
        data-open={open}
      >
        <Link
          to="/"
          className="workspace-brand"
          onClick={() => setOpenAt(null)}
        >
          <span>
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          TrustShield AI
        </Link>
        <nav aria-label="Workspace" className="workspace-nav">
          {navigation.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpenAt(null)}>
              <Icon size={19} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          className="workspace-logout"
          type="button"
          onClick={signOut}
          disabled={busy}
        >
          <LogOut size={19} aria-hidden="true" />{' '}
          {busy ? 'Signing out…' : 'Log Out'}
        </button>
      </aside>
      <div className="workspace-body">
        {error && (
          <div className="workspace-content pb-0">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
