import { ShieldCheck } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { Container } from '../ui/Surfaces';

export function CTASection() {
  return (
    <section className="closing-section" aria-labelledby="closing-title">
      <Container>
        <div className="closing-panel">
          <ShieldCheck
            className="closing-art"
            strokeWidth={0.65}
            aria-hidden="true"
          />
          <div>
            <h2 id="closing-title">Make Safer Decisions Online.</h2>
            <p>
              TrustShield AI is being built to help you recognize warning signs
              before they become costly mistakes.
            </p>
          </div>
          <LinkButton to="/#product-preview" variant="secondary">
            Explore the Platform
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}
