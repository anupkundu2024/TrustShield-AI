import {
  ArrowRight,
  CircleHelp,
  ClipboardCheck,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Surfaces';
import { useAuth } from '../contexts/authContext';
import { scanKinds, scanners } from '../data/scanners';

const steps = [
  {
    icon: ScanLine,
    title: 'Choose a scanner',
    description: 'Use the scanner that fits the material you received.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review the evidence',
    description: 'Look at the warning signs and the limits of the assessment.',
  },
  {
    icon: CircleHelp,
    title: 'Verify independently',
    description: 'Confirm requests through an official channel before you act.',
  },
];

export function AppHomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="workspace-content grid gap-8">
      <section className="workspace-hero">
        <div className="relative z-10 grid justify-items-start gap-4">
          <h1 className="text-3xl font-bold tracking-tight wrap-anywhere sm:text-5xl">
            Welcome, {user.fullName.trim().split(/\s+/)[0]}
          </h1>
          <p className="max-w-md text-lg text-slate-200">
            Check suspicious messages, links, offers, images and documents
            before you act.
          </p>
          <LinkButton to="#scanners" variant="secondary">
            Start New Scan <ArrowRight size={17} aria-hidden="true" />
          </LinkButton>
        </div>
        <div className="workspace-shield" aria-hidden="true">
          <ShieldCheck />
        </div>
      </section>

      <section id="scanners" aria-labelledby="scanners-heading" tabIndex={-1}>
        <h2
          id="scanners-heading"
          className="mb-4 text-2xl font-bold tracking-tight text-navy"
        >
          Choose a scanner
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scanKinds.map((kind) => {
            const { label, description, icon: Icon, tone } = scanners[kind];
            return (
              <Card
                key={kind}
                className="workspace-tool flex flex-col items-start gap-3 p-5"
              >
                <span className="workspace-icon" data-tone={tone}>
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3 className="font-bold text-navy">{label}</h3>
                <p className="grow text-sm leading-6 text-muted">
                  {description}
                </p>
                <Link className="workspace-action" to={'/app/scan/' + kind}>
                  Open {label} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="getting-started">
        <Card className="p-5 sm:p-7">
          <h2 className="text-xl font-bold text-navy" id="getting-started">
            After you receive something suspicious
          </h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }) => (
              <li className="flex items-start gap-3" key={title}>
                <Icon
                  size={20}
                  className="mt-0.5 shrink-0 text-teal-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold text-navy">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
        <div className="min-w-0">
          <h2 className="font-bold text-navy">Your account</h2>
          <p className="mt-1 text-sm text-muted wrap-anywhere">{user.email}</p>
        </div>
        <LinkButton to="/app/profile" variant="secondary">
          Manage Profile
        </LinkButton>
      </Card>
    </div>
  );
}
