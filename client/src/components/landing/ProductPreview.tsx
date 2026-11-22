import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Info,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Container, SectionHeading } from '../ui/Surfaces';

function ReportFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="report-frame">
      <div className="report-bar">
        <span className="report-brand">
          <ShieldCheck size={18} aria-hidden="true" /> {label}
        </span>
        <span className="report-example">Sample report</span>
      </div>
      {children}
    </div>
  );
}

const heroEvidence = [
  { icon: CircleDollarSign, label: 'Upfront payment requested' },
  { icon: BadgeCheck, label: 'Unverified recruitment claim' },
  { icon: Clock3, label: 'Pressure to complete payment' },
];

export function HeroPreview() {
  return (
    <figure className="hero-preview">
      <div className="hero-preview-art" aria-hidden="true">
        <ShieldCheck strokeWidth={0.85} />
      </div>
      <figcaption id="hero-preview-label" className="preview-label">
        <ScanLine size={16} aria-hidden="true" /> Illustrative Product Preview
      </figcaption>
      <ReportFrame label="TrustShield Analysis">
        <div className="hero-report-body">
          <div className="sample-message">
            <h2>
              <BriefcaseBusiness size={17} aria-hidden="true" /> Suspicious Job
              Offer
            </h2>
            <p>
              “Congratulations! You have been selected. Pay a registration fee
              to confirm your position.”
            </p>
          </div>
          <div className="risk-box">
            <TriangleAlert size={20} aria-hidden="true" />
            <div>
              <p>Potential warning signs detected</p>
              <span>Elevated risk indicators</span>
            </div>
            <span className="risk-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <ul className="hero-evidence" role="list">
            {heroEvidence.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={15} aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </ReportFrame>
    </figure>
  );
}

const evidence = [
  'Request for upfront payment',
  'No verified official company communication',
  'Urgent response demanded',
];

const actions = [
  'Verify the employer through its official website',
  'Avoid sending money or identity documents before verification',
  'Contact the organization independently',
];

export function ProductPreview() {
  return (
    <section
      id="product-preview"
      tabIndex={-1}
      aria-labelledby="preview-title"
      className="landing-section preview-section"
    >
      <Container className="preview-layout">
        <div className="preview-intro">
          <p className="section-label">PRODUCT PREVIEW</p>
          <SectionHeading
            id="preview-title"
            title="Clarity Behind Every Warning."
            description="See how a recruitment message could be reviewed, from the first warning sign to the steps you can take before replying."
          />
          <p className="preview-notice">
            <Info size={18} aria-hidden="true" /> The safety checker is in
            development. This example shows what a future report could look
            like.
          </p>
        </div>
        <ReportFrame label="Safety Report">
          <div className="detailed-report">
            <div className="report-summary">
              <span className="report-scan">
                <BriefcaseBusiness size={16} aria-hidden="true" /> Recruitment
                message
              </span>
              <h3>Suspicious Recruitment Message</h3>
              <p className="risk-badge">
                <TriangleAlert size={15} aria-hidden="true" /> Elevated Risk
                Indicators
              </p>
              <p>
                The offer asks for a fee before the employer or role can be
                independently verified.
              </p>
            </div>
            <div className="report-columns">
              <div>
                <h4>
                  <ClipboardList size={17} aria-hidden="true" /> Evidence
                </h4>
                <ul role="list">
                  {evidence.map((item) => (
                    <li key={item}>
                      <CircleAlert size={15} aria-hidden="true" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>
                  <ShieldCheck size={17} aria-hidden="true" /> Suggested actions
                </h4>
                <ul role="list">
                  {actions.map((item) => (
                    <li key={item}>
                      <CircleCheck size={15} aria-hidden="true" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="report-disclaimer">
              <Info size={15} aria-hidden="true" /> Demonstration data only.
              Risk assessments are not guarantees.
            </p>
          </div>
        </ReportFrame>
      </Container>
    </section>
  );
}
