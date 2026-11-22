import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '../ui/Surfaces';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="account-background py-8 sm:py-14">
      <Container>
        <div className="account-split">
          <aside className="account-illustration hidden lg:flex">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <ShieldCheck aria-hidden="true" /> TrustShield AI
            </div>
            <div className="account-orbit" aria-hidden="true">
              <div className="account-orbit-center">
                <ShieldCheck size={64} strokeWidth={1.25} />
              </div>
            </div>
            <p className="max-w-sm text-4xl leading-tight font-bold tracking-tight">
              Stay One Step Ahead of Scams.
            </p>
          </aside>
          <div className="min-w-0 p-6 sm:p-10 lg:p-12">
            <Link
              to="/"
              className="account-link inline-flex items-center gap-2 text-sm"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to Home
            </Link>
            <h1 className="mt-7 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 mb-7 text-muted">{subtitle}</p>
            {children}
          </div>
        </div>
      </Container>
    </section>
  );
}
