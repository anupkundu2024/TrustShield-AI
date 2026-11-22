import { CTASection } from '../components/landing/CTASection';
import { FAQSection } from '../components/landing/FAQSection';
import { HeroSection } from '../components/landing/HeroSection';
import {
  FeaturesSection,
  HowItWorksSection,
  ProblemSection,
  WhyTrustShield,
} from '../components/landing/LandingSections';
import { ProductPreview } from '../components/landing/ProductPreview';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ProductPreview />
      <WhyTrustShield />
      <FAQSection />
      <CTASection />
    </>
  );
}
