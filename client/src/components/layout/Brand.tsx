import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" className="brand" onClick={onClick}>
      <span className="brand-icon">
        <ShieldCheck size={22} aria-hidden="true" />
      </span>
      <span>
        TrustShield <span className="brand-ai">AI</span>
      </span>
    </Link>
  );
}
