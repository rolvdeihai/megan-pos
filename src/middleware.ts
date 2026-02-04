import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const ownerToken = request.cookies.get('megan_pos_auth');
  const staffToken = request.cookies.get('megan_pos_staff');
  const { pathname } = request.nextUrl;

  // Debug log
  console.log(`[Middleware] Path: ${pathname}, Owner Token: ${!!ownerToken}, Staff Token: ${!!staffToken}`);

  // Public paths yang tidak perlu auth
  const publicPaths = [
    '/login', 
    '/register', 
    '/', 
    '/api/auth/login', 
    '/api/auth/logout', 
    '/api/auth/me',
    '/api/staff/login',
    '/api/staff/logout',
    '/api/staff/session'
  ];
  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Path staff login (misal: /resto-slug/staff-login)
  const staffLoginPath = /^\/[^\/]+\/staff-login$/;
  
  // Protected routes untuk owner only
  const ownerOnlyRoutes = [
    '/dashboard/settings',
    '/dashboard/employees',
    '/dashboard/billing',
    '/setup-restaurant'
  ];

  // Allow staff login page
  if (staffLoginPath.test(pathname)) {
    console.log(`[Middleware] Staff login page, allowing access`);
    return NextResponse.next();
  }

  // Check owner-only routes
  const isOwnerOnlyRoute = ownerOnlyRoutes.some(route => pathname.startsWith(route));
  
  if (isOwnerOnlyRoute) {
    console.log(`[Middleware] Owner-only route: ${pathname}`);
    if (!ownerToken) {
      console.log(`[Middleware] No owner token, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check dashboard routes (allow both owner and staff)
  if (pathname.startsWith('/dashboard')) {
    console.log(`[Middleware] Dashboard route: ${pathname}`);
    
    // Jika tidak ada token sama sekali
    if (!ownerToken && !staffToken) {
      console.log(`[Middleware] No auth tokens, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Jika ada salah satu token, izinkan akses
    console.log(`[Middleware] Auth token found, allowing access`);
    return NextResponse.next();
  }

  // Untuk rute lain yang dilindungi (selain dashboard) hanya untuk owner
  if (!ownerToken && !isPublicPath) {
    console.log(`[Middleware] No owner token for protected route, redirect to login from ${pathname}`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login sebagai owner tapi akses login/register page
  if (ownerToken && (pathname === '/login' || pathname === '/register')) {
    console.log(`[Middleware] Already logged in as owner, redirect to dashboard from ${pathname}`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
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
  ]
};