import type { Metadata } from 'next';
import { redirect, RedirectType } from 'next/navigation';
import { FAQ_CONTENT } from '@/constants/faq';
import { getFromCookies } from '@/utils/cookie';

import { config } from '@/config';
import { paths } from '@/paths';
import { verifyToken } from '@/lib/generate-token';
import { generateFaqSchema, generateOrganizationSchema, generateWebPageSchema, JsonLd } from '@/lib/structured-data';
import Cta from '@/components/landing/CTA';
import Faq from '@/components/landing/FAQ';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Navbar from '@/components/landing/Navbar';
import Showcase from '@/components/landing/Showcase';

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

export default async function Home() {
  const token = await getFromCookies<string>('token');
  if (token) {
    try {
      const data = verifyToken(token);
      if (data) redirect(paths.dashboard, RedirectType.replace);
    } catch {
      // invalid or expired token — show home page
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd data={generateWebPageSchema(config.site.title, config.site.description, config.site.url.toString())} />
      <JsonLd data={generateFaqSchema([...FAQ_CONTENT])} />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
