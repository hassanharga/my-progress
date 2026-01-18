import type { MetadataRoute } from 'next';
import { config } from '@/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = config.site.url;
  const currentDate = new Date();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/auth`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/playground`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];
}
