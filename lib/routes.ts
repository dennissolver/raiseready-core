// lib/routes.ts
// ============================================================================
// ROUTE HELPERS
// Generates URLs using the client's configured URL prefix
// ============================================================================

import { clientConfig } from '@/config';

const prefix = clientConfig.platform.urlPrefix;

/**
 * Portal routes (investor/admin side)
 */
export const portalRoutes = {
  dashboard: `/${prefix}/dashboard`,
  profile: `/${prefix}/profile`,
  thesis: `/${prefix}/thesis`,
  discovery: `/${prefix}/discovery`,
  discoveryConfirm: `/${prefix}/discovery/confirm`,
  watchlist: `/${prefix}/watchlist`,
} as const;

/**
 * Founder routes (founder side)
 */
export const founderRoutes = {
  dashboard: '/founder/dashboard',
  upload: '/founder/upload',
  profile: '/founder/profile',
  discovery: '/founder/discovery',
  practice: '/founder/practice',
} as const;

/**
 * Auth routes
 */
export const authRoutes = {
  login: '/login',
  signup: '/signup',
  signupFounder: '/signup/founder',
  callback: '/callback',
} as const;

/**
 * Get the portal URL prefix
 */
export const getPortalPrefix = () => `/${prefix}`;

/**
 * Generate a portal route with optional path
 */
export const portalRoute = (path: string = '') => `/${prefix}${path}`;

/**
 * Check if a path is a portal route
 */
export const isPortalRoute = (pathname: string) =>
  pathname.startsWith(`/${prefix}`) || pathname.startsWith('/portal');