import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Protect all /admin routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.user?.role !== 'admin') {
      // Logged in but not admin — redirect home silently
      return NextResponse.redirect(new URL('/shop/coffee', req.url));
    }
  }

  // Protect customer account dashboard
  if (pathname.startsWith('/account/dashboard') && !session) {
    const loginUrl = new URL('/account/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/admin/:path*', '/account/dashboard/:path*'],
};
