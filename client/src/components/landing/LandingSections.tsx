import type { LucideIcon } from 'lucide-react';
import { benefits, features, problems, steps } from '../../data/landingContent';
import { Card, Container, SectionHeading } from '../ui/Surfaces';

type IconTone = 'teal' | 'blue' | 'violet';

function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone: IconTone }) {
  return (
    <span className={`icon-tile tone-${tone}`}>
      <Icon size={23} aria-hidden="true" />
    </span>
  );
}

export function ProblemSection() {
  return (
    <section
      className="landing-section problem-section"
      aria-labelledby="problem-title"
    >
      <Container>
        <div className="section-intro">
          <p className="section-label">EVERYDAY DIGITAL RISKS</p>
          <SectionHeading
            id="problem-title"
            title="Scams Are Getting Smarter. Your Awareness Should Too."
            description="Suspicious requests can be hard to spot at a glance. A clear explanation of the warning signs can help you decide what to do next."
          />
        </div>
        <div className="three-card-grid">
          {problems.map(({ icon, tone, title, description }) => (
            <Card key={title} className="landing-card problem-card">
              <IconTile icon={icon} tone={tone} />
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      tabIndex={-1}
      className="landing-section features-section"
      aria-labelledby="features-title"
    >
      <Container>
        <div className="section-intro">
          <SectionHeading
            id="features-title"
            title="One Platform. Multiple Layers of Protection."
          />
        </div>
        <div className="feature-grid">
          {features.map(({ icon, tone, title, description }) => (
            <Card key={title} className="landing-card feature-card">
              <IconTile icon={icon} tone={tone} />
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      className="landing-section workflow-section"
      aria-labelledby="workflow-title"
    >
      <Container>
        <div className="section-intro">
          <SectionHeading
            id="workflow-title"
            title="Digital Safety, Made Simple."
            description="Choose a scanner, check the warning signs, and review the recommended next steps."
          />
        </div>
        <ol className="workflow-grid" role="list">
          {steps.map(({ icon, tone, title, description }, index) => (
            <li key={title}>
              <div className="step-markers">
                <IconTile icon={icon} tone={tone} />
                <span className="step-number" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <h3>
                <span className="sr-only">Step {index + 1}. </span>
                {title}
              </h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function WhyTrustShield() {
  return (
    <section
      id="why-trustshield"
      tabIndex={-1}
      className="landing-section why-section"
      aria-labelledby="why-title"
    >
      <Container>
        <div className="section-intro">
          <p className="section-label">WHY TRUSTSHIELD</p>
          <SectionHeading
            id="why-title"
            title="Built for Confidence, Not Confusion."
          />
        </div>
        <div className="three-card-grid">
          {benefits.map(({ icon, tone, title, description }) => (
            <Card key={title} className="landing-card benefit-card">
              <IconTile icon={icon} tone={tone} />
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
