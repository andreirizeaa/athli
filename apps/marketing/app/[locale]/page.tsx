import { setRequestLocale } from 'next-intl/server';
import HeroSection from '@/components/hero-section';
import Footer from '@/components/footer';
import Pricing from '@/components/pricing';
import FAQsTwo from '@/components/faqs-2';
import CallToAction from '@/components/call-to-action';
import FeaturesSection from '@/components/features-6';
import MobileAppsSection from '@/components/mobile-apps';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <MobileAppsSection />
      <Pricing hideAddons />
      <FAQsTwo />
      <CallToAction />
      <Footer />
    </>
  );
}
