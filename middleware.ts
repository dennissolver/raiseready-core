// middleware.ts
// ============================================================================
// URL REWRITING MIDDLEWARE
// Rewrites /{clientPrefix}/* → /portal/* for branded client URLs
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Import at build time - this is the URL prefix for this deployment
// In production, this comes from config/client.ts
const CLIENT_URL_PREFIX = process.env.NEXT_PUBLIC_CLIENT_URL_PREFIX || 'portal';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if already accessing /portal/* directly (internal routing)
  if (pathname.startsWith('/portal')) {
    return NextResponse.next();
  }

  // Rewrite /{clientPrefix}/* → /portal/*
  if (pathname.startsWith(`/${CLIENT_URL_PREFIX}`)) {
    const newPath = pathname.replace(`/${CLIENT_URL_PREFIX}`, '/portal');
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.rewrite(url);
  }

  // Handle auth redirects - rewrite /portal/* back to /{clientPrefix}/* in responses
  // This ensures the browser URL shows the branded prefix
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*|public).*)',
  ],
};