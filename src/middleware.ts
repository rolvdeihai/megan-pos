import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLegacyRolePermissions, getRequiredPermissionForPath, hasPermission } from '@/lib/permissions';
import { parseJsonCookie } from '@/lib/cookie-utils';

export function middleware(request: NextRequest) {
  const ownerToken = request.cookies.get('megan_pos_auth');
  const staffToken = request.cookies.get('megan_pos_staff');
  const { pathname } = request.nextUrl;
  const ownerSession = parseJsonCookie<{ userId?: string }>(ownerToken?.value);
  const hasValidOwnerSession = Boolean(ownerSession?.userId);
  const hasInvalidOwnerCookie = Boolean(ownerToken?.value) && !hasValidOwnerSession;

  const withCookieCleanup = (response: NextResponse) => {
    if (hasInvalidOwnerCookie) {
      response.cookies.delete('megan_pos_auth');
    }
    return response;
  };

  // Public paths yang tidak perlu auth
  const publicPaths = [
    '/login',
    '/register',
    '/',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/current',
    '/api/staff/login',
    '/api/staff/logout',
    '/api/staff/session',
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Path staff login (misal: /resto-slug/staff-login)
  const staffLoginPath = /^\/[^\/]+\/staff-login$/;

  // Owner-only routes (non-dashboard)
  const ownerOnlyRoutes = ['/setup-restaurant'];

  // Allow staff login page
  if (staffLoginPath.test(pathname)) {
    return NextResponse.next();
  }

  // Check dashboard routes (allow both owner and staff)
  if (pathname.startsWith('/dashboard')) {
    // Jika tidak ada token sama sekali
    if (!hasValidOwnerSession && !staffToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withCookieCleanup(NextResponse.redirect(loginUrl));
    }

    // Owner always has full access
    if (hasValidOwnerSession) {
      return withCookieCleanup(NextResponse.next());
    }

    // Staff permission check
    const requiredPermission = getRequiredPermissionForPath(pathname);
    if (!requiredPermission) {
      return withCookieCleanup(NextResponse.next());
    }

    try {
      const staffData = parseJsonCookie<{ permissions?: string[]; role?: string }>(staffToken?.value);
      const hasPermissionsField = Array.isArray(staffData?.permissions);
      const staffPermissions = hasPermissionsField
        ? (staffData?.permissions as string[])
        : getLegacyRolePermissions(staffData?.role);

      if (hasPermission(staffPermissions, requiredPermission)) {
        return withCookieCleanup(NextResponse.next());
      }
    } catch (error) {
      console.error('[Middleware] Failed to parse staff token:', error);
    }

    return withCookieCleanup(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  // Check owner-only routes (non-dashboard)
  const isOwnerOnlyRoute = ownerOnlyRoutes.some((route) => pathname.startsWith(route));

  if (isOwnerOnlyRoute) {
    if (!hasValidOwnerSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withCookieCleanup(NextResponse.redirect(loginUrl));
    }
  }

  // Untuk rute lain yang dilindungi (selain dashboard) hanya untuk owner
  if (!hasValidOwnerSession && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withCookieCleanup(NextResponse.redirect(loginUrl));
  }

  // Jika sudah login sebagai owner tapi akses login/register page
  if (hasValidOwnerSession && (pathname === '/login' || pathname === '/register')) {
    return withCookieCleanup(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return withCookieCleanup(NextResponse.next());
}

// Matcher harus eksplisit
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/setup-restaurant/:path*',
    '/products/:path*',
    '/orders/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/:slug/staff-login',
  ],
};
