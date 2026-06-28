export function getSiteURL(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || // Automatically set by Vercel.
    'http://localhost:3000';

  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;

  if (process.env.NODE_ENV === 'production' && url.startsWith('http://localhost')) {
    console.warn(
      'NEXT_PUBLIC_SITE_URL is not set. OG images and canonical URLs will resolve against localhost. Set it in your production environment.',
    );
  }

  return url;
}
