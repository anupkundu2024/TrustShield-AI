import { Info, Play, ScanLine, Sparkles } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { Badge, Container } from '../ui/Surfaces';
import { HeroPreview } from './ProductPreview';

export function HeroSection() {
  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <Container className="hero-layout">
        <div className="hero-copy">
          <Badge className="hero-badge">
            <Sparkles size={15} aria-hidden="true" /> AI-Powered Digital Safety
          </Badge>
          <h1 id="hero-title">
            Stay One Step <span>Ahead of Scams.</span>
          </h1>
          <p className="hero-description">
            Understand suspicious messages, links, and job offers with
            AI-assisted risk analysis and clear, actionable insights.
          </p>
          <div className="hero-actions">
            <LinkButton
              to="/#product-preview"
              aria-describedby="hero-preview-label"
            >
              <ScanLine size={18} aria-hidden="true" /> Start a Safety Check
            </LinkButton>
            <LinkButton to="/#how-it-works" variant="secondary">
              <Play size={16} aria-hidden="true" /> Explore How It Works
            </LinkButton>
          </div>
          <p className="hero-caption">
            <Info size={16} aria-hidden="true" /> Designed to help you recognize
            digital warning signs.
          </p>
        </div>
        <HeroPreview />
      </Container>
    </section>
  );
}
