import { Link } from 'react-router';
import { Container } from '../ui/Surfaces';
import { Brand } from './Brand';
import { landingLinks } from './Navbar';

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div>
            <Brand />
            <p>Safer decisions start with better information.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="/screenshot-scanner/" className="nav-link">
              Screenshot Scanner
            </a>
            <a href="/privacy/" className="nav-link">
              Privacy
            </a>
            {landingLinks
              .filter(({ to }) => to !== '/#why-trustshield')
              .map(({ to, label }) => (
                <Link key={to} to={to} className="nav-link">
                  {label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} TrustShield AI. All rights reserved.
          </p>
          <p>Public sample reports use demonstration data.</p>
        </div>
      </Container>
    </footer>
  );
}
