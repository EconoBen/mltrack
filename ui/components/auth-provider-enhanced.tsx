'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

// Mock session for development when auth is not configured
const mockSession = {
  user: {
    id: 'dev-user',
    name: 'Developer',
    email: 'dev@mltrack.local',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
};

export function AuthProviderEnhanced({ children }: AuthProviderProps) {
  const [authMode, setAuthMode] = useState<'loading' | 'disabled' | 'enabled'>('loading');

  useEffect(() => {
    // Check auth configuration from response headers
    fetch('/api/health')
      .then((res) => {
        const mode = res.headers.get('X-Auth-Mode');
        if (mode === 'disabled' || mode === 'development-error') {
          setAuthMode('disabled');
        } else {
          setAuthMode('enabled');
        }
      })
      .catch(() => {
        setAuthMode('disabled');
      });
  }, []);

  // Show loading state while checking
  if (authMode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  // If auth is disabled, provide a mock session
  if (authMode === 'disabled') {
    return (
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    );
  }

  // Normal auth flow
  return <SessionProvider>{children}</SessionProvider>;
}