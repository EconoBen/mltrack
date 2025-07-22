import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Check if authentication is configured
const isAuthConfigured = () => {
  return !!(process.env.NEXTAUTH_SECRET || process.env.NODE_ENV === 'development');
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip auth for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }
  
  // If auth is not configured, allow all access
  if (!isAuthConfigured()) {
    // Add a header to indicate auth is disabled
    const response = NextResponse.next();
    response.headers.set('X-Auth-Mode', 'disabled');
    return response;
  }
  
  // For auth pages, always allow
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }
  
  // Check user's auth mode choice
  const authMode = request.cookies.get('mltrack-auth-mode')?.value;
  
  // In development mode without proper auth setup, allow all access
  if ((process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_SECRET) || authMode === 'development') {
    const response = NextResponse.next();
    response.headers.set('X-Auth-Mode', 'development');
    return response;
  }
  
  // Check for session
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET || 'development-secret-please-change-in-production' 
    });
    
    // If no token and auth is configured, redirect to sign in
    if (!token && process.env.NEXTAUTH_SECRET) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    
    // Allow access
    const response = NextResponse.next();
    response.headers.set('X-Auth-Mode', token ? 'authenticated' : 'guest');
    return response;
  } catch (error) {
    // If there's an error with auth, allow access in dev mode
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.next();
      response.headers.set('X-Auth-Mode', 'development-error');
      return response;
    }
    // In production, redirect to error page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/error';
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};