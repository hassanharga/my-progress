import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { paths } from './paths';
import { logger } from './utils/logger';
import { isTokenExpired } from './utils/token';

// Define the paths to exclude from validation
const excludedPaths = [paths.home, paths.playground];

// This function can be marked `async` if using `await` inside
export async function proxy(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = req.nextUrl;
    const isExpired = await isTokenExpired();

    // Redirect authenticated users away from /auth
    if (pathname === paths.auth && !isExpired) {
      logger.debug('Proxy: redirecting authenticated user away from /auth');
      return NextResponse.redirect(new URL(paths.dashboard, req.url));
    }

    // Bypass authentication check for excluded paths
    if (excludedPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Redirect unauthenticated users to login
    if (isExpired) {
      logger.debug(`Proxy: redirecting unauthenticated request from ${pathname} to /auth`);
      return NextResponse.redirect(new URL(paths.auth, req.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid token
    return NextResponse.redirect(new URL(paths.auth, req.url));
  }
}

// See "Matching Paths" below to learn more
// export const config = {
//   matcher: "/about/:path*",
// };
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - public (public folder)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|public|favicon.ico|sitemap.xml|robots.txt|opengraph-image.png).*)',
  ],
};
