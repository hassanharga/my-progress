import type { MetadataRoute } from 'next';
import { config } from '@/config';

/**
 * Web App Manifest
 * Defines how the app appears when installed as a PWA
 * 
 * Note: This is a TypeScript version. The actual manifest.json in /public
 * is what browsers will use. Keep them in sync.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.site.name,
    short_name: 'Progress',
    description: config.site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
