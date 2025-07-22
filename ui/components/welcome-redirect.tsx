'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function WelcomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Skip if already on welcome or setup pages
    if (pathname === '/welcome' || pathname === '/setup') return;

    // Check if user has made a choice
    const authChoice = localStorage.getItem('mltrack-auth-choice');
    const skipWelcome = localStorage.getItem('mltrack-skip-welcome');

    // If no choice made and not configured, redirect to welcome
    if (!authChoice && !skipWelcome) {
      // Check if auth is configured
      fetch('/api/auth/status')
        .then(res => res.json())
        .then(data => {
          if (data.mode !== 'production') {
            router.replace('/welcome');
          }
        })
        .catch(() => {
          // On error, assume not configured
          router.replace('/welcome');
        });
    }
  }, [pathname, router]);

  return null;
}