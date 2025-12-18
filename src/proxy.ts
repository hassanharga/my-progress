import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { paths } from './paths';
import { isTokenExpired } from './utils/token';

// Define the paths to exclude from validation
const excludedPaths = [paths.auth, paths.playground];

// This function can be marked `async` if using `await` inside
export async function proxy(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = req.nextUrl;

    // Bypass authentication check for certain paths
    if (excludedPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Check if the token has expired
    const isExpired = await isTokenExpired(); // current time in seconds
    if (isExpired) {
      return NextResponse.redirect(new URL(paths.auth, req.url));
    }

    // If authenticated, proceed
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
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
