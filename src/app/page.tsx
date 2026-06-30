import type { Metadata } from 'next';

import { config } from '@/config';
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

const faqContent = [
  {
    question: 'Is it free to use?',
    answer: 'Yes, My Progress is completely free to use. No hidden fees, no credit card required.',
  },
  {
    question: 'Do I need to install anything?',
    answer: 'No, My Progress runs entirely in your browser. Just sign up and start tracking.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Your data is stored securely and is only accessible by you. We use encrypted authentication and never share your information.',
  },
  {
    question: 'Can I use it on mobile?',
    answer: 'Yes, My Progress is fully responsive and works great on phones, tablets, and desktops.',
  },
];

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
      <JsonLd data={generateFaqSchema(faqContent)} />
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
