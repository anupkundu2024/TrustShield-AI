import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../contexts/authContext';
import { useLogout } from '../auth/useLogout';
import { LinkButton } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { Container } from '../ui/Surfaces';
import { Brand } from './Brand';

export const landingLinks = [
  { label: 'Features', to: '/#features' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Why TrustShield', to: '/#why-trustshield' },
  { label: 'FAQ', to: '/#faq' },
];

export function Navbar() {
  const { key } = useLocation();
  return <Navigation key={key} />;
}

function Navigation() {
  const { user, isLoading } = useAuth();
  const { busy, error, signOut } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        setMenuOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const renderLinks = (onSelect?: () => void) =>
    landingLinks.map(({ label, to }) => (
      <Link key={to} to={to} className="nav-link" onClick={onSelect}>
        {label}
      </Link>
    ));

  function renderAccountLinks(onSelect?: () => void) {
    if (isLoading)
      return (
        <span role="status" className="px-2 text-sm text-muted">
          Checking session…
        </span>
      );
    if (user) {
      return (
        <>
          <Link to="/app" className="nav-link" onClick={onSelect}>
            My Workspace
          </Link>
          <Link to="/app/profile" className="nav-link" onClick={onSelect}>
            Profile
          </Link>
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={signOut}
          >
            {busy ? 'Signing out…' : 'Log Out'}
          </button>
        </>
      );
    }
    return (
      <>
        <Link to="/login" className="nav-link" onClick={onSelect}>
          Sign In
        </Link>
        <LinkButton to="/signup" onClick={onSelect}>
          Get Started
        </LinkButton>
      </>
    );
  }

  return (
    <header
      className="site-header"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          closeMenu();
      }}
    >
      <Container className="header-row">
        <Brand onClick={closeMenu} />
        <nav aria-label="Main navigation" className="desktop-nav">
          {renderLinks()}
        </nav>
        <div className="desktop-actions">{renderAccountLinks()}</div>
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </Container>
      <div
        id="mobile-navigation"
        className="mobile-menu"
        data-open={menuOpen}
        inert={!menuOpen}
      >
        <div className="mobile-menu-inner">
          <Container className="mobile-menu-content">
            <nav aria-label="Mobile navigation">{renderLinks(closeMenu)}</nav>
            <div className="mobile-actions">
              {renderAccountLinks(closeMenu)}
            </div>
          </Container>
        </div>
      </div>
      {error && (
        <Container className="pb-3">
          <Alert variant="danger">{error}</Alert>
        </Container>
      )}
    </header>
  );
}
