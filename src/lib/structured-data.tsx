import { config } from '@/config';

/**
 * JSON-LD Structured Data Helpers
 * These functions generate structured data markup for better SEO
 * and rich snippets in search results.
 */

/**
 * Generate Organization Schema
 * Use this in your root layout or homepage
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: config.site.name,
    description: config.site.description,
    url: config.site.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/**
 * Generate WebSite Schema with SearchAction
 * Helps search engines understand your site structure
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.site.name,
    url: config.site.url,
    description: config.site.description,
  };
}

/**
 * Generate BreadcrumbList Schema
 * Improves navigation understanding for search engines
 *
 * @param items - Array of breadcrumb items with name and url
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate WebPage Schema
 * Use this on individual pages
 *
 * @param title - Page title
 * @param description - Page description
 * @param url - Page URL
 */
export function generateWebPageSchema(title: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: url,
    isPartOf: {
      '@type': 'WebSite',
      name: config.site.name,
      url: config.site.url,
    },
  };
}

/**
 * Generate FAQPage Schema
 * Enables FAQ rich results in search
 */
export function generateFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Component to render JSON-LD script
 * Usage: <JsonLd data={generateOrganizationSchema()} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
