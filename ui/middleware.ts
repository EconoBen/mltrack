import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // Allow access to auth pages
      if (req.nextUrl.pathname.startsWith('/auth')) {
        return true;
      }
      // Allow access to API routes
      if (req.nextUrl.pathname.startsWith('/api')) {
        return true;
      }
      // DEVELOPMENT: Allow all access for now
      // TODO: Remove this line in production
      return true;
      
      // Require authentication for all other routes
      // return !!token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});

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