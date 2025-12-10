import HeroSection from '@/components/hero-section';
import Features from '@/components/features-4';
import Footer from '@/components/footer';
import FAQsTwo from '@/components/faqs-2';
import Pricing from '@/components/pricing';
import FeaturesSection from '@/components/features-7';

export default function Home() {
  return (
    <>
      <HeroSection />
      <Features />
      <FeaturesSection />
      <FAQsTwo />
      <Footer />
    </>
  );
}
