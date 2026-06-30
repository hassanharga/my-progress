import type { Metadata } from 'next';

import { config } from '@/config';
import { FAQ_CONTENT } from '@/constants/faq';
import { generateFaqSchema, generateOrganizationSchema, generateWebPageSchema, JsonLd } from '@/lib/structured-data';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Showcase from '@/components/landing/Showcase';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: {
    absolute: config.site.title,
  },
  description: config.site.description,
  alternates: {
    canonical: config.site.url,
  },
  openGraph: {
    title: config.site.title,
    description: config.site.description,
    url: config.site.url,
    type: 'website',
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd
        data={generateWebPageSchema(
          config.site.title,
          config.site.description,
          config.site.url.toString()
        )}
      />
      <JsonLd data={generateFaqSchema([...FAQ_CONTENT])} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
